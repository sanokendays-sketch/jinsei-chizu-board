// ④ 書き出し：ボードの画像、年表の印刷(PDF)、自分史の文章
import { useState } from "react";
import { exportToBlob } from "@excalidraw/excalidraw";
import { offerFile } from "./storage.js";
import { whenLabel } from "./cards.js";
import { ageAt, findBirth } from "./TimelineView.jsx";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

/** 年表を、そのまま読める文章にする（LINEやメール、AIへの相談にも貼れる） */
export function cardsToText(cards, board, template, meta) {
  const birth = findBirth(meta, cards, template);
  const lines = [`${board.title}`, `（${today()} 書き出し・カード${cards.length}枚）`, ""];
  let decade = undefined;
  for (const c of cards) {
    const d = c.year ? Math.floor(c.year / 10) * 10 : null;
    if (d !== decade) {
      decade = d;
      lines.push(d === null ? "■ 年がわからないもの" : `■ ${d}年代`);
    }
    const age = ageAt(birth, c);
    lines.push(`${c.year ? whenLabel(c) : "年不明"}${age ? `（${age}）` : ""}　${c.title}`);
    if (c.place) lines.push(`　場所：${c.place}`);
    if (c.note) for (const l of c.note.split("\n")) lines.push(`　${l}`);
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

export default function ExportDialog({ api, board, template, cards, meta, onClose, onPrintTimeline, onToast }) {
  const [busy, setBusy] = useState("");
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  const run = async (label, fn) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      if (e?.code === "declined") onToast("保存をやめました");
      else onToast("うまく書き出せませんでした");
    } finally {
      setBusy("");
    }
  };

  const saveImage = () =>
    run("image", async () => {
      const elements = api.getSceneElements();
      if (!elements.length) {
        onToast("ボードにまだ何もありません");
        return;
      }
      const blob = await exportToBlob({
        elements,
        files: api.getFiles(),
        appState: { ...api.getAppState(), exportBackground: true, exportWithDarkMode: false },
        mimeType: "image/png",
        exportPadding: 40,
        maxWidthOrHeight: 4000,
      });
      await offerFile(`${board.title}-${stamp}.png`, blob, "image/png");
      onToast("画像を書き出しました");
    });

  const text = cardsToText(cards, board, template, meta);

  const saveText = () =>
    run("text", async () => {
      await offerFile(`${board.title}-${stamp}.txt`, text, "text/plain");
      onToast("文章を書き出しました");
    });

  const copyText = () =>
    run("copy", async () => {
      await navigator.clipboard.writeText(text);
      onToast("文章をコピーしました。LINEやメールに貼り付けられます");
    });

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog export">
        <h2>書き出す・印刷する</h2>

        <div className="export-item">
          <div>
            <b>🖼 ボードを画像で</b>
            <p>キャンバス全体を1枚の画像(PNG)にします。家族に送るときに。</p>
          </div>
          <button className="btn" disabled={Boolean(busy)} onClick={saveImage}>
            {busy === "image" ? "作っています…" : "画像にする"}
          </button>
        </div>

        <div className="export-item">
          <div>
            <b>📅 年表を印刷・PDFに</b>
            <p>年表画面を印刷します。印刷画面で「PDFとして保存」を選ぶとPDFになります。</p>
          </div>
          <button className="btn" disabled={Boolean(busy)} onClick={onPrintTimeline}>
            印刷する
          </button>
        </div>

        <div className="export-item">
          <div>
            <b>📝 文章で</b>
            <p>年表を文章にします。コピーしてLINEやメール、AIへの相談に貼れます。</p>
          </div>
          <div className="export-buttons">
            <button className="btn" disabled={Boolean(busy) || !cards.length} onClick={copyText}>
              コピー
            </button>
            <button className="btn" disabled={Boolean(busy) || !cards.length} onClick={saveText}>
              ファイルに
            </button>
          </div>
        </div>

        {cards.length > 0 && (
          <details className="export-preview">
            <summary>文章の中身を見る</summary>
            <pre>{text}</pre>
          </details>
        )}

        <div className="dialog-actions">
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
