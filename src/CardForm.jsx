// カードの入力フォーム（新規・編集）。言葉はボードのテンプレートに合わせる
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { shrinkPhoto } from "./cards.js";

const MapPicker = lazy(() => import("./MapPicker.jsx"));
const hasLoc = (c) => Number.isFinite(c?.lat) && Number.isFinite(c?.lng);

// その月の日数（年が空なら閏年扱いで29日まで出す）
function daysIn(year, month) {
  if (!month) return 31;
  return new Date(Number(year) || 2000, Number(month), 0).getDate();
}

export default function CardForm({ form, setForm, onSubmit, onDelete, onError, template }) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const photoInput = useRef(null);
  const v = form.values;
  const set = (k) => (e) => setForm({ ...form, values: { ...v, [k]: e.target.value } });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (pickerOpen) setPickerOpen(false);
      else setForm(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setForm, pickerOpen]);

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
        <h2>{form.mode === "edit" ? "カードを編集" : template.formNew}</h2>

        <label className="field">
          <span>いつ？</span>
          <div className="row">
            <input
              type="number"
              inputMode="numeric"
              min="1900"
              max={template.future ? thisYear + 20 : thisYear}
              placeholder={template.future ? `例：${thisYear + 1}` : "例：1978"}
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
          <input type="text" placeholder={template.titlePlaceholder} value={v.title} onChange={set("title")} />
        </label>

        <div className="field">
          <label htmlFor="place-input">どこで？</label>
          <input
            id="place-input"
            type="text"
            placeholder={template.placePlaceholder}
            value={v.place}
            onChange={set("place")}
          />
          {hasLoc(v) ? (
            <div className="loc-row">
              <span className="loc-ok">🗾 地図に置きました</span>
              <button type="button" className="btn btn-small" onClick={() => setPickerOpen(true)}>
                変更
              </button>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => setForm({ ...form, values: { ...v, lat: null, lng: null } })}
              >
                外す
              </button>
            </div>
          ) : (
            <button type="button" className="btn loc-add" onClick={() => setPickerOpen(true)}>
              🗾 地図で場所を選ぶ
            </button>
          )}
        </div>

        {pickerOpen &&
          createPortal(
          <Suspense fallback={<div className="picker loading">地図を読み込んでいます…</div>}>
            <MapPicker
              initial={hasLoc(v) ? { lat: v.lat, lng: v.lng } : null}
              query={v.place}
              onClose={() => setPickerOpen(false)}
              onPick={(p) => {
                setForm({
                  ...form,
                  values: { ...v, lat: p.lat, lng: p.lng, place: v.place.trim() ? v.place : p.name || v.place },
                });
                setPickerOpen(false);
              }}
            />
          </Suspense>,
            document.body,
          )}

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
          <textarea rows={4} placeholder={template.notePlaceholder} value={v.note} onChange={set("note")} />
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
