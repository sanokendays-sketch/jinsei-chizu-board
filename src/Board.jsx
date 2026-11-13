// 1枚のボード：キャンバス(Excalidraw)・地図・年表の3つの見方と、カードの追加・編集・保存
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Excalidraw,
  CaptureUpdateAction,
  FONT_FAMILY,
  getSceneVersion,
  newElementWith,
  restoreElements,
} from "@excalidraw/excalidraw";
import {
  buildCardElements,
  cardData,
  findCardIdInSelection,
  findFreeSpot,
  listCards,
  newId,
  shiftElements,
} from "./cards.js";
import { makeBackup, offerFile, parseBackup, saveBoard } from "./storage.js";
import CardForm from "./CardForm.jsx";
import { buildSampleElements, hasSampleFor, isSampleElement } from "./sample.js";

// 地図と年表は開いたときに読み込む（最初の表示を軽くするため）
const MapView = lazy(() => import("./MapView.jsx"));
const TimelineView = lazy(() => import("./TimelineView.jsx"));
const ExportDialog = lazy(() => import("./ExportDialog.jsx"));

const BASE_APPSTATE = {
  viewBackgroundColor: "#fffaf0",
  currentItemFontFamily: FONT_FAMILY.Excalifont,
};

const EMPTY_FORM = { year: "", month: "", day: "", title: "", place: "", note: "", lat: null, lng: null };

const VIEWS = [
  ["board", "🗒", "ボード"],
  ["map", "🗾", "地図"],
  ["timeline", "📅", "年表"],
];

export default function Board({ board, template, initial, onSaved, onOpenBoards, onImportAsNew }) {
  const apiRef = useRef(null);
  const saveTimer = useRef(null);
  const lastKey = useRef("");
  const saveErrorShown = useRef(false);
  const latestRef = useRef(null); // 最後に見たキャンバスの中身（ボードを切り替えるときの保存用）
  const dirtyRef = useRef(false);

  const [initialData] = useState(() =>
    initial
      ? {
          elements: restoreElements(initial.elements || [], null),
          files: initial.files || {},
          appState: { ...BASE_APPSTATE, ...initial.appState },
        }
      : { appState: BASE_APPSTATE },
  );
  const [meta, setMetaState] = useState(initial?.meta || {});
  const metaRef = useRef(meta);

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [hasContent, setHasContent] = useState(() => (initialData.elements || []).some((el) => !el.isDeleted));
  const [hasSample, setHasSample] = useState(() => (initialData.elements || []).some(isSampleElement));
  const [confirmSampleRemove, setConfirmSampleRemove] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [form, setForm] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [toast, setToast] = useState(null);
  const [view, setView] = useState("board"); // board | map | timeline
  const [sceneVersion, setSceneVersion] = useState(0);
  const [mapFocus, setMapFocus] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const importInput = useRef(null);

  useEffect(() => {
    document.title = `${board.title} - 人生地図ボード`;
  }, [board.title]);

  const showToast = useCallback((text) => {
    setToast(text);
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => setToast(null), 3200);
  }, []);

  // ---- 自動保存 ----
  const saveNow = useCallback(async () => {
    const latest = latestRef.current;
    if (!latest) return;
    dirtyRef.current = false;
    const count = await saveBoard(board.id, latest.elements, latest.appState, latest.files, metaRef.current);
    onSaved?.(count);
  }, [board.id, onSaved]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await saveNow();
        setSaveState("saved");
        setLastSavedAt(new Date());
      } catch {
        setSaveState("error");
        if (!saveErrorShown.current) {
          saveErrorShown.current = true;
          showToast("この環境では自動保存できません。メニューの「バックアップを保存」を使ってください");
        }
      }
    }, 800);
  }, [saveNow, showToast]);

  // ボードを切り替える(このボードが閉じる)ときに、保存待ちがあればすぐ保存する
  useEffect(
    () => () => {
      clearTimeout(saveTimer.current);
      if (dirtyRef.current) saveNow().catch(() => {});
    },
    [saveNow],
  );

  const setMeta = (m) => {
    metaRef.current = m;
    setMetaState(m);
    scheduleSave();
  };

  const onChange = useCallback(
    (elements, appState, files) => {
      latestRef.current = { elements, appState, files };
      setSelectedCardId(findCardIdInSelection(elements, appState.selectedElementIds));
      setHasContent(elements.some((el) => !el.isDeleted));
      setHasSample(elements.some(isSampleElement));
      const version = getSceneVersion(elements);
      setSceneVersion(version);
      const key = [
        version,
        Object.keys(files || {}).length,
        Math.round(appState.scrollX),
        Math.round(appState.scrollY),
        appState.zoom.value.toFixed(2),
        appState.viewBackgroundColor,
      ].join("|");
      if (key !== lastKey.current) {
        lastKey.current = key;
        scheduleSave();
      }
    },
    [scheduleSave],
  );

  // 見本入りで作ったボードは、開いたときに全体が見えるように縮める
  useEffect(() => {
    if (!metaRef.current?.fitOnOpen) return;
    const t = setTimeout(() => {
      const api = apiRef.current;
      if (!api) return;
      api.scrollToContent(api.getSceneElements(), { fitToViewport: true, viewportZoomFactor: 0.9 });
      const { fitOnOpen, ...rest } = metaRef.current;
      setMeta(rest);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 見本のライフストーリー ----
  const insertSample = async () => {
    const api = apiRef.current;
    if (!api) return;
    setMenuOpen(false);
    // すでにカードがあるボードでは、重ならないように右側に並べる
    const alive = api.getSceneElements();
    let origin;
    if (alive.length) {
      const maxX = Math.max(...alive.map((el) => el.x + Math.abs(el.width)));
      const minY = Math.min(...alive.map((el) => el.y));
      origin = { x: maxX + 160, y: minY };
    }
    const { elements: els, files: sampleFiles } = await buildSampleElements(template, origin);
    if (sampleFiles.length) api.addFiles(sampleFiles);
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), ...els],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    setView("board");
    setTimeout(() => api.scrollToContent(els, { fitToViewport: true, viewportZoomFactor: 0.9, animate: true }), 80);
    showToast("見本の人生を入れました。地図と年表も見てみてください");
  };

  const removeSample = () => {
    const api = apiRef.current;
    if (!api) return;
    const elements = api
      .getSceneElementsIncludingDeleted()
      .map((el) => (isSampleElement(el) ? newElementWith(el, { isDeleted: true }) : el));
    api.updateScene({ elements, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
    setConfirmSampleRemove(false);
    showToast("見本を消しました。書き換えたカードは残っています");
  };

  // ---- カードの追加・編集 ----
  const openNew = () => {
    setMenuOpen(false);
    setForm({ mode: "new", values: { ...EMPTY_FORM }, photo: null, keepPhoto: false, existingPhoto: null });
  };

  const openEdit = (cardId = selectedCardId) => {
    const api = apiRef.current;
    if (!api || !cardId) return;
    const rect = api
      .getSceneElements()
      .find((el) => el.type === "rectangle" && el.customData?.cardId === cardId);
    if (!rect) return;
    const c = rect.customData;
    const existingPhoto = c.fileId ? api.getFiles()[c.fileId]?.dataURL || null : null;
    setMenuOpen(false);
    setForm({
      mode: "edit",
      cardId,
      values: {
        year: c.year ?? "",
        month: c.month ?? "",
        day: c.day ?? "",
        title: c.title,
        place: c.place,
        note: c.note,
        lat: c.lat ?? null,
        lng: c.lng ?? null,
      },
      fileId: c.fileId,
      photo: null,
      keepPhoto: Boolean(existingPhoto),
      existingPhoto,
    });
  };

  const submitForm = async () => {
    const api = apiRef.current;
    if (!api || !form) return;
    const v = form.values;
    if (!v.title.trim()) {
      showToast("タイトルを入れてください");
      return;
    }
    let fileId = null;
    let photo = null;
    if (form.photo) {
      fileId = newId();
      api.addFiles([{ id: fileId, dataURL: form.photo.dataURL, mimeType: "image/jpeg", created: Date.now() }]);
      photo = form.photo;
    } else if (form.keepPhoto && form.fileId && form.existingPhoto) {
      fileId = form.fileId;
      photo = { dataURL: form.existingPhoto };
    }

    const elements = api.getSceneElementsIncludingDeleted();
    const isEdit = form.mode === "edit";

    const card = cardData({
      cardId: isEdit ? form.cardId : newId(),
      year: String(v.year).trim(),
      month: v.month,
      day: v.day,
      title: v.title.trim(),
      place: v.place.trim(),
      note: v.note.trim(),
      fileId,
      lat: v.lat,
      lng: v.lng,
    });
    // まず(0,0)に作ってから、置き場所へ動かす
    let newEls = await buildCardElements(card, 0, 0, photo, template.palette);
    if (isEdit) {
      const rect = elements.find(
        (el) => !el.isDeleted && el.type === "rectangle" && el.customData?.cardId === form.cardId,
      );
      newEls = shiftElements(newEls, rect?.x ?? 0, rect?.y ?? 0);
    } else {
      const st = api.getAppState();
      const z = st.zoom.value;
      const center = { x: st.width / 2 / z - st.scrollX, y: st.height / 2 / z - st.scrollY };
      const spot = findFreeSpot(elements, center, { w: newEls[0].width, h: newEls[0].height });
      newEls = shiftElements(newEls, spot.x, spot.y);
    }
    const kept = isEdit
      ? elements.map((el) =>
          !el.isDeleted && el.customData?.cardId === form.cardId ? newElementWith(el, { isDeleted: true }) : el,
        )
      : elements;

    api.updateScene({
      elements: [...kept, ...newEls],
      appState: {
        selectedElementIds: Object.fromEntries(newEls.map((el) => [el.id, true])),
        selectedGroupIds: { [newEls[0].groupIds[0]]: true },
      },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    if (!isEdit && view === "board") api.scrollToContent(newEls, { animate: true });
    setForm(null);
    showToast(isEdit ? "カードを更新しました" : view === "board" ? "カードを置きました" : "カードをボードに置きました");
  };

  const deleteCard = () => {
    const api = apiRef.current;
    if (!api || !form?.cardId) return;
    const elements = api
      .getSceneElementsIncludingDeleted()
      .map((el) => (!el.isDeleted && el.customData?.cardId === form.cardId ? newElementWith(el, { isDeleted: true }) : el));
    api.updateScene({ elements, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
    setForm(null);
    showToast("カードを削除しました（ボードの「元に戻す」で復活できます）");
  };

  // ---- 見方の切り替えと、カードへの移動 ----
  const switchView = (next) => {
    setMenuOpen(false);
    setView(next);
  };

  const focusCard = (card, target = "board") => {
    const api = apiRef.current;
    if (!api) return;
    if (target === "map") {
      setView("map");
      setMapFocus({ id: card.cardId, t: Date.now() });
      return;
    }
    const wasOther = view !== "board";
    setView("board");
    const els = api.getSceneElements().filter((el) => el.customData?.cardId === card.cardId);
    api.updateScene({
      appState: {
        selectedElementIds: Object.fromEntries(els.map((el) => [el.id, true])),
        selectedGroupIds: card.groupId ? { [card.groupId]: true } : {},
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    // 地図や年表から戻った直後はキャンバスの大きさが整ってから動かす
    setTimeout(() => api.scrollToContent(els, { animate: true }), wasOther ? 80 : 0);
  };

  // ---- バックアップ ----
  const saveBackup = async () => {
    setMenuOpen(false);
    const api = apiRef.current;
    if (!api) return;
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    try {
      await offerFile(
        `${board.title}-${stamp}.json`,
        makeBackup(api.getSceneElementsIncludingDeleted(), api.getFiles(), board, metaRef.current),
      );
      showToast("バックアップを保存しました");
    } catch (e) {
      if (e?.code === "declined") showToast("保存をやめました");
      else showToast("この画面ではファイル保存ができませんでした");
    }
  };

  const pickImport = () => {
    setMenuOpen(false);
    importInput.current?.click();
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPendingImport(parseBackup(await file.text()));
    } catch (err) {
      showToast(err?.message || "読み込めませんでした");
    }
  };

  const applyImport = () => {
    const api = apiRef.current;
    if (!api || !pendingImport) return;
    const files = Object.values(pendingImport.files || {});
    if (files.length) api.addFiles(files);
    const elements = restoreElements(pendingImport.elements, null);
    api.updateScene({ elements, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
    if (pendingImport.meta) setMeta(pendingImport.meta);
    setView("board");
    if (elements.length) setTimeout(() => api.scrollToContent(elements, { fitToViewport: true, viewportZoomFactor: 0.8 }), 80);
    setPendingImport(null);
    showToast("バックアップから読み込みました");
  };

  // 地図・年表・書き出しで使うカードの一覧（キャンバスの中身が変わったときだけ作り直す）
  const needCards = view !== "board" || exportOpen;
  const cards = useMemo(
    () => (needCards && apiRef.current ? listCards(apiRef.current.getSceneElements()) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [needCards, sceneVersion],
  );
  const files = useMemo(
    () => (needCards && apiRef.current ? { ...apiRef.current.getFiles() } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [needCards, sceneVersion],
  );

  const saveLabel =
    saveState === "saving"
      ? "保存中…"
      : saveState === "error"
        ? "保存できていません"
        : lastSavedAt
          ? `保存済み（${lastSavedAt.getHours()}:${String(lastSavedAt.getMinutes()).padStart(2, "0")}）`
          : "保存済み";

  return (
    <div className={`app view-${view}`}>
      <header className="bar">
        <nav className="views" aria-label="見方の切り替え">
          {VIEWS.map(([key, icon, label]) => (
            <button
              key={key}
              className={`view-tab${view === key ? " on" : ""}`}
              aria-pressed={view === key}
              onClick={() => switchView(key)}
            >
              <span className="view-icon" aria-hidden>
                {icon}
              </span>
              {label}
            </button>
          ))}
        </nav>
        <span className="brand-name" title={board.title}>
          {template.icon} {board.title}
        </span>
        <span className="spacer" />
        <div className="actions">
          <button className="btn btn-primary" onClick={openNew}>
            ＋ {template.addLabel}
          </button>
          <button className="btn btn-icon btn-menu" aria-label="メニュー" onClick={() => setMenuOpen((o) => !o)}>
            ⋯<span className={`dot dot-${saveState}`} aria-hidden />
          </button>
        </div>
        {menuOpen && (
          <div className="menu" role="menu">
            <div className={`menu-status save-${saveState}`}>● {saveLabel}</div>
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenBoards();
              }}
            >
              📚 {template.icon} {board.title}
              <span className="menu-sub">ボードの切り替え・新しいボード</span>
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                setExportOpen(true);
              }}
            >
              📤 書き出す・印刷する
              <span className="menu-sub">画像・年表のPDF・文章</span>
            </button>
            {hasSampleFor(template) && !hasSample && (
              <button onClick={insertSample}>
                📖 見本の人生を入れる
                <span className="menu-sub">架空の人物の一生。あとでまとめて消せます</span>
              </button>
            )}
            <button onClick={saveBackup}>💾 バックアップを保存</button>
            <button onClick={pickImport}>📂 バックアップから読み込む</button>
            <div className="menu-note">
              ボードはこの端末のブラウザに自動保存されます。大事な思い出は時々バックアップしてください。
            </div>
          </div>
        )}
      </header>

      {hasSample && (
        <div className="sample-bar" role="note">
          <span>
            📖 <b>見本の人生</b>（架空の人物）
            <span className="sample-bar-sub">　書き換えたカードは、あなたのカードとして残ります</span>
          </span>
          {confirmSampleRemove ? (
            <span className="sample-bar-actions">
              <button className="btn btn-small btn-danger" onClick={removeSample}>
                見本を消す
              </button>
              <button className="btn btn-small" onClick={() => setConfirmSampleRemove(false)}>
                やめる
              </button>
            </span>
          ) : (
            <button className="btn btn-small" onClick={() => setConfirmSampleRemove(true)}>
              見本を消す…
            </button>
          )}
        </div>
      )}

      <main className="canvas">
        <Excalidraw
          excalidrawAPI={(api) => (apiRef.current = api)}
          initialData={initialData}
          onChange={onChange}
          langCode="ja-JP"
          UIOptions={{
            canvasActions: { loadScene: false, export: false, saveToActiveFile: false, saveAsImage: false },
          }}
        />
        {view === "board" && !hasContent && (
          <div className="empty-hint">
            <div className="empty-title">{template.emptyTitle}</div>
            {hasSampleFor(template) ? (
              <>
                <div>何を書けばいいか迷ったら、まず見本を見てみましょう。</div>
                <button className="btn btn-primary sample-btn" onClick={insertSample}>
                  📖 見本の人生を入れてみる
                </button>
                <div className="empty-sub">
                  誕生から入学・就職・結婚・転勤まで、架空の人物の一生です。あとでまとめて消せます。
                  <br />
                  自分で書くなら、右上の「＋ {template.addLabel}」から。
                </div>
              </>
            ) : (
              <>
                <div>右上の「＋ {template.addLabel}」から、最初のカードを作りましょう。</div>
                <div className="empty-sub">{template.emptySub}</div>
              </>
            )}
          </div>
        )}
        {view === "board" && selectedCardId && (
          <button className="edit-fab" onClick={() => openEdit()}>
            ✏️ このカードを編集
          </button>
        )}
        {view === "map" && (
          <Suspense fallback={<div className="mapview loading">地図を読み込んでいます…</div>}>
            <MapView
              cards={cards}
              files={files}
              focusId={mapFocus}
              onOpenBoard={(c) => focusCard(c, "board")}
              onEdit={(id) => openEdit(id)}
            />
          </Suspense>
        )}
        {view === "timeline" && (
          <Suspense fallback={<div className="timeline loading">年表を作っています…</div>}>
            <TimelineView
              cards={cards}
              files={files}
              template={template}
              meta={meta}
              setMeta={setMeta}
              title={board.title}
              onOpen={focusCard}
              onEdit={(id) => openEdit(id)}
              onAdd={openNew}
              onSample={hasSampleFor(template) ? insertSample : null}
            />
          </Suspense>
        )}
      </main>

      {form && (
        <CardForm
          form={form}
          setForm={setForm}
          onSubmit={submitForm}
          onDelete={deleteCard}
          onError={showToast}
          template={template}
        />
      )}

      {exportOpen && (
        <Suspense fallback={null}>
          <ExportDialog
            api={apiRef.current}
            board={board}
            template={template}
            cards={cards}
            meta={meta}
            onClose={() => setExportOpen(false)}
            onPrintTimeline={() => {
              setExportOpen(false);
              setView("timeline");
              setTimeout(() => window.print(), 600);
            }}
            onToast={showToast}
          />
        </Suspense>
      )}

      {pendingImport && (
        <div className="overlay">
          <div className="dialog small">
            <h2>バックアップを読み込みます</h2>
            <p>
              「{pendingImport.board?.title || "バックアップ"}」（カード{" "}
              {pendingImport.elements.filter((el) => el.customData?.kind === "memory").length}枚）
            </p>
            <div className="choice-list">
              <button
                className="btn btn-primary"
                onClick={() => {
                  const data = pendingImport;
                  setPendingImport(null);
                  onImportAsNew(data);
                }}
              >
                新しいボードとして追加する
              </button>
              <button className="btn" onClick={applyImport}>
                今のボード「{board.title}」と置き換える
              </button>
              <button className="btn" onClick={() => setPendingImport(null)}>
                やめる
              </button>
            </div>
          </div>
        </div>
      )}

      <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
