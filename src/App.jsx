import { useCallback, useEffect, useRef, useState } from "react";
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
  shrinkPhoto,
  whenLabel,
} from "./cards.js";
import { loadLocal, makeBackup, offerFile, parseBackup, saveLocal } from "./storage.js";

const BASE_APPSTATE = {
  viewBackgroundColor: "#fffaf0",
  currentItemFontFamily: FONT_FAMILY.Excalifont,
};

const EMPTY_FORM = { year: "", month: "", day: "", title: "", place: "", note: "" };

export default function App() {
  const apiRef = useRef(null);
  const saveTimer = useRef(null);
  const lastKey = useRef("");
  const saveErrorShown = useRef(false);

  const [initialData] = useState(() =>
    loadLocal().then((saved) =>
      saved
        ? {
            elements: restoreElements(saved.elements, null),
            files: saved.files || {},
            appState: { ...BASE_APPSTATE, ...saved.appState },
          }
        : { appState: BASE_APPSTATE },
    ),
  );

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [hasContent, setHasContent] = useState(true);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [form, setForm] = useState(null); // { mode, cardId, values, photo, keepPhoto, existingPhoto }
  const [listOpen, setListOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [toast, setToast] = useState(null);
  const importInput = useRef(null);

  useEffect(() => {
    initialData.then((d) => setHasContent((d.elements || []).some((el) => !el.isDeleted)));
  }, [initialData]);

  const showToast = useCallback((text) => {
    setToast(text);
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => setToast(null), 3200);
  }, []);

  // ---- 自動保存 ----
  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      const api = apiRef.current;
      if (!api) return;
      try {
        await saveLocal(api.getSceneElementsIncludingDeleted(), api.getAppState(), api.getFiles());
        setSaveState("saved");
      } catch {
        setSaveState("error");
        if (!saveErrorShown.current) {
          saveErrorShown.current = true;
          showToast("この環境では自動保存できません。メニューの「バックアップを保存」を使ってください");
        }
      }
    }, 800);
  }, [showToast]);

  const onChange = useCallback(
    (elements, appState, files) => {
      setSelectedCardId(findCardIdInSelection(elements, appState.selectedElementIds));
      setHasContent(elements.some((el) => !el.isDeleted));
      const key = [
        getSceneVersion(elements),
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

  // ---- カードの追加・編集 ----
  const openNew = () => {
    setMenuOpen(false);
    setListOpen(false);
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
    setListOpen(false);
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
    });
    // まず(0,0)に作ってから、置き場所へ動かす
    let newEls = await buildCardElements(card, 0, 0, photo);
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
    if (!isEdit) api.scrollToContent(newEls, { animate: true });
    setForm(null);
    showToast(isEdit ? "カードを更新しました" : "カードを置きました");
  };

  const deleteCard = () => {
    const api = apiRef.current;
    if (!api || !form?.cardId) return;
    const elements = api
      .getSceneElementsIncludingDeleted()
      .map((el) => (!el.isDeleted && el.customData?.cardId === form.cardId ? newElementWith(el, { isDeleted: true }) : el));
    api.updateScene({ elements, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
    setForm(null);
    showToast("カードを削除しました（元に戻すボタンで復活できます）");
  };

  // ---- 一覧からカードへ移動 ----
  const focusCard = (card) => {
    const api = apiRef.current;
    if (!api) return;
    const els = api.getSceneElements().filter((el) => el.customData?.cardId === card.cardId);
    api.updateScene({
      appState: {
        selectedElementIds: Object.fromEntries(els.map((el) => [el.id, true])),
        selectedGroupIds: card.groupId ? { [card.groupId]: true } : {},
      },
      captureUpdate: CaptureUpdateAction.NEVER,
    });
    api.scrollToContent(els, { animate: true });
    setListOpen(false);
  };

  // ---- バックアップ ----
  const saveBackup = async () => {
    setMenuOpen(false);
    const api = apiRef.current;
    if (!api) return;
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    try {
      await offerFile(`jinsei-board-${stamp}.json`, makeBackup(api.getSceneElementsIncludingDeleted(), api.getFiles()));
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
    if (elements.length) api.scrollToContent(elements, { fitToViewport: true, viewportZoomFactor: 0.8 });
    setPendingImport(null);
    showToast("バックアップから読み込みました");
  };

  const cards = listOpen && apiRef.current ? listCards(apiRef.current.getSceneElements()) : [];

  return (
    <div className="app">
      <header className="bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>🗺️</span>
          <span className="brand-name">人生地図ボード</span>
          <span className={`save save-${saveState}`}>
            {saveState === "saving" ? "保存中…" : saveState === "saved" ? "保存済み" : saveState === "error" ? "未保存" : ""}
          </span>
        </div>
        <div className="actions">
          {selectedCardId && (
            <button className="btn" onClick={() => openEdit()}>
              ✏️ 編集
            </button>
          )}
          <button
            className="btn"
            onClick={() => {
              setMenuOpen(false);
              setListOpen((o) => !o);
            }}
          >
            📜 一覧
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            ＋ 思い出
          </button>
          <button className="btn btn-icon" aria-label="メニュー" onClick={() => setMenuOpen((o) => !o)}>
            ⋯
          </button>
        </div>
        {menuOpen && (
          <div className="menu" role="menu">
            <button onClick={saveBackup}>💾 バックアップを保存</button>
            <button onClick={pickImport}>📂 バックアップから読み込む</button>
            <div className="menu-note">ボードはこの端末のブラウザに自動保存されます。大事な思い出は時々バックアップしてください。</div>
          </div>
        )}
      </header>

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
        {!hasContent && (
          <div className="empty-hint">
            <div className="empty-title">あなたの人生を、1枚ずつ。</div>
            <div>右上の「＋ 思い出」から、最初のカードを作りましょう。</div>
            <div className="empty-sub">生まれた町、通った学校、初めての職場…どこからでも大丈夫です。</div>
          </div>
        )}
        {listOpen && (
          <aside className="list">
            <div className="list-head">
              <span>思い出一覧（年の順）</span>
              <button className="btn btn-icon" aria-label="閉じる" onClick={() => setListOpen(false)}>
                ✕
              </button>
            </div>
            {cards.length === 0 ? (
              <div className="list-empty">まだカードがありません</div>
            ) : (
              <ol>
                {cards.map((c) => (
                  <li key={c.cardId}>
                    <button className="list-item" onClick={() => focusCard(c)}>
                      <span className="li-when">{whenLabel(c)}</span>
                      <span className="li-title">{c.title}</span>
                      {c.place && <span className="li-place">📍 {c.place}</span>}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        )}
      </main>

      {form && (
        <CardForm
          form={form}
          setForm={setForm}
          onSubmit={submitForm}
          onDelete={deleteCard}
          onError={showToast}
        />
      )}

      {pendingImport && (
        <div className="overlay">
          <div className="dialog small">
            <h2>バックアップから読み込みますか？</h2>
            <p>
              今のボードは、バックアップの内容（カード{" "}
              {pendingImport.elements.filter((el) => el.customData?.kind === "memory").length} 枚）に置き換わります。
            </p>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setPendingImport(null)}>
                やめる
              </button>
              <button className="btn btn-primary" onClick={applyImport}>
                読み込む
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

// その月の日数（年が空なら閏年扱いで29日まで出す）
function daysIn(year, month) {
  if (!month) return 31;
  return new Date(Number(year) || 2000, Number(month), 0).getDate();
}

function CardForm({ form, setForm, onSubmit, onDelete, onError }) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const photoInput = useRef(null);
  const v = form.values;
  const set = (k) => (e) => setForm({ ...form, values: { ...v, [k]: e.target.value } });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setForm(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setForm]);

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setBusy(true);
      const photo = await shrinkPhoto(file);
      setForm({ ...form, photo, keepPhoto: false });
    } catch {
      onError("この写真は読み込めませんでした");
    } finally {
      setBusy(false);
    }
  };

  const preview = form.photo?.dataURL || (form.keepPhoto ? form.existingPhoto : null);
  const thisYear = new Date().getFullYear();

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
      <form
        className="dialog"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSubmit();
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{form.mode === "edit" ? "思い出カードを編集" : "新しい思い出カード"}</h2>

        <label className="field">
          <span>いつ？</span>
          <div className="row">
            <input
              type="number"
              inputMode="numeric"
              min="1900"
              max={thisYear}
              placeholder="例：1978"
              value={v.year}
              onChange={set("year")}
            />
            <span className="unit">年</span>
          </div>
          <div className="row">
            <select
              value={v.month}
              onChange={(e) =>
                setForm({ ...form, values: { ...v, month: e.target.value, day: e.target.value ? v.day : "" } })
              }
            >
              <option value="">月（任意）</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}月
                </option>
              ))}
            </select>
            <select value={v.day} onChange={set("day")} disabled={!v.month}>
              <option value="">日（任意）</option>
              {Array.from({ length: daysIn(v.year, v.month) }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}日
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="field">
          <span>
            タイトル<em>必須</em>
          </span>
          <input type="text" placeholder="例：小学校の入学式" value={v.title} onChange={set("title")} />
        </label>

        <label className="field">
          <span>どこで？</span>
          <input type="text" placeholder="例：宮城県仙台市青葉区" value={v.place} onChange={set("place")} />
          <small>地図との連動は次の段階（②）で追加します</small>
        </label>

        <div className="field">
          <span>写真</span>
          {preview ? (
            <div className="photo">
              <img src={preview} alt="" />
              <div className="photo-actions">
                <button type="button" className="btn" onClick={() => photoInput.current?.click()}>
                  差し替える
                </button>
                <button type="button" className="btn" onClick={() => setForm({ ...form, photo: null, keepPhoto: false })}>
                  外す
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn photo-add" onClick={() => photoInput.current?.click()}>
              📷 写真を選ぶ（任意）
            </button>
          )}
          <input ref={photoInput} type="file" accept="image/*" hidden onChange={onPhoto} />
        </div>

        <label className="field">
          <span>メモ</span>
          <textarea rows={4} placeholder="その頃のこと、誰といたか、何を感じたか…" value={v.note} onChange={set("note")} />
        </label>

        <div className="dialog-actions">
          {form.mode === "edit" &&
            (confirmDelete ? (
              <button type="button" className="btn btn-danger" onClick={onDelete}>
                本当に削除
              </button>
            ) : (
              <button type="button" className="btn btn-ghost-danger" onClick={() => setConfirmDelete(true)}>
                削除
              </button>
            ))}
          <span className="spacer" />
          <button type="button" className="btn" onClick={() => setForm(null)}>
            やめる
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "処理中…" : form.mode === "edit" ? "更新する" : "ボードに置く"}
          </button>
        </div>
      </form>
    </div>
  );
}
