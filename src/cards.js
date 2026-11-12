// 思い出カード：データ(customData)と、キャンバス上の見た目(Excalidraw要素)を作る
import { convertToExcalidrawElements, FONT_FAMILY } from "@excalidraw/excalidraw";

export const CARD_KIND = "memory";
const W = 300; // カードの幅
const P = 16; // 内側の余白
const INNER = W - P * 2;
const GAP = 8;
const FONT = FONT_FAMILY.Helvetica; // 端末の標準フォント（日本語が読みやすい）

const COLORS = {
  bg: "#fff4dc",
  border: "#c8963e",
  year: "#a8551a",
  title: "#2b2118",
  place: "#5b4a3a",
  note: "#3f3328",
};

export const newId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, "");

/** カードのデータ（customData に入れる中身）。②で lat/lng、④でタグなどを足していく */
export function cardData({ cardId, year, month, day, title, place, note, fileId, lat, lng }) {
  const round = (n) => Math.round(Number(n) * 1e6) / 1e6;
  const located = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && lat !== null && lng !== null;
  return {
    kind: CARD_KIND,
    v: 1,
    cardId,
    year: year ? Number(year) : null,
    month: month ? Number(month) : null,
    day: month && day ? Number(day) : null,
    title: title || "",
    place: place || "",
    note: note || "",
    fileId: fileId || null,
    lat: located ? round(lat) : null, // ② 地図上の場所
    lng: located ? round(lng) : null,
  };
}

export function whenLabel(card) {
  if (!card.year) return "年不明";
  const m = card.month ? `${card.month}月` : "";
  const d = card.month && card.day ? `${card.day}日` : "";
  return `${card.year}年${m}${d}`;
}

// ---- 文字の折り返し（Excalidrawと同じフォント指定で幅を測る）----
let measureCtx;
function textWidth(text, size) {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  measureCtx.font = `${size}px Helvetica, Segoe UI Emoji`;
  return measureCtx.measureText(text).width;
}

// 行の頭に来ないほうがいい文字（簡易の禁則処理）
const NO_LINE_START = new Set(Array.from("、。，．・：；？！ー～）」』】〉》ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ"));

function wrap(text, size, maxWidth) {
  const out = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const ch of Array.from(para)) {
      const over = line && textWidth(line + ch, size) > maxWidth;
      if (over && NO_LINE_START.has(ch) && textWidth(line + ch, size) <= maxWidth + size) {
        line += ch; // 1文字だけはみ出しを許して、句読点を行頭に送らない
      } else if (over) {
        out.push(line);
        line = ch.trim() ? ch : "";
      } else {
        line += ch;
      }
    }
    out.push(line);
  }
  return out.join("\n");
}

function textSkeleton(text, size, color, x, y) {
  return {
    type: "text",
    x,
    y,
    text: wrap(text, size, INNER),
    fontSize: size,
    fontFamily: FONT,
    strokeColor: color,
  };
}

/** 写真を縮小して JPEG の dataURL にする（スマホの大きな写真でも軽く保存できる） */
export async function shrinkPhoto(file, max = 1024) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    return { dataURL: canvas.toDataURL("image/jpeg", 0.82), width: w, height: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function imageSize(dataURL) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve({ width: im.naturalWidth, height: im.naturalHeight });
    im.onerror = () => resolve({ width: 4, height: 3 });
    im.src = dataURL;
  });
}

/**
 * カード1枚分の要素を作る。
 * 枠(rectangle)の customData にカードの全データを持たせ、
 * 中の文字や写真には cardId だけを持たせてグループにまとめる。
 */
export async function buildCardElements(card, x, y, photo) {
  const parts = [];
  let cy = y + P;

  const addText = (text, size, color, role) => {
    const [el] = convertToExcalidrawElements([textSkeleton(text, size, color, x + P, cy)], {
      regenerateIds: true,
    });
    parts.push({ el, role });
    cy += el.height + GAP;
  };

  addText(whenLabel(card), 26, COLORS.year, "when");
  addText(card.title || "（無題）", 22, COLORS.title, "title");
  if (card.place) addText(`📍 ${card.place}`, 16, COLORS.place, "place");

  if (photo && card.fileId) {
    const size = photo.width ? photo : await imageSize(photo.dataURL);
    let w = INNER;
    let h = (size.height / size.width) * w;
    if (h > 240) {
      h = 240;
      w = (size.width / size.height) * h;
    }
    cy += 4;
    const [img] = convertToExcalidrawElements(
      [{ type: "image", x: x + P + (INNER - w) / 2, y: cy, width: w, height: h, fileId: card.fileId }],
      { regenerateIds: true },
    );
    parts.push({ el: { ...img, status: "saved" }, role: "photo" });
    cy += h + GAP + 4;
  }

  if (card.note) addText(card.note, 16, COLORS.note, "note");

  const height = cy - GAP + P - y;
  const [rect] = convertToExcalidrawElements(
    [
      {
        type: "rectangle",
        x,
        y,
        width: W,
        height,
        backgroundColor: COLORS.bg,
        strokeColor: COLORS.border,
        fillStyle: "solid",
        strokeWidth: 2,
        roughness: 1,
        roundness: { type: 3 },
      },
    ],
    { regenerateIds: true },
  );

  const groupId = newId();
  return [
    { ...rect, groupIds: [groupId], customData: card },
    ...parts.map(({ el, role }) => ({
      ...el,
      groupIds: [groupId],
      customData: { cardId: card.cardId, role },
    })),
  ];
}

/** 要素の束をまとめて dx, dy だけ動かす */
export function shiftElements(elements, dx, dy) {
  return elements.map((el) => ({ ...el, x: el.x + dx, y: el.y + dy }));
}

/**
 * 画面の中心付近で、ほかの要素と重ならない場所を探す。
 * 中心から外側へ、ぐるっと候補を試していく。
 */
export function findFreeSpot(existing, center, size) {
  const boxes = existing
    .filter((el) => !el.isDeleted)
    .map((el) => ({ x1: el.x, y1: el.y, x2: el.x + Math.abs(el.width), y2: el.y + Math.abs(el.height) }));
  const M = 24; // カード同士のすき間
  const hits = (x, y) =>
    boxes.some((b) => x < b.x2 + M && x + size.w + M > b.x1 && y < b.y2 + M && y + size.h + M > b.y1);
  const sx = size.w + M;
  const sy = 80;
  const base = { x: center.x - size.w / 2, y: center.y - Math.min(size.h, 400) / 2 };
  const candidates = [];
  for (let i = -8; i <= 8; i++) {
    for (let j = -24; j <= 24; j++) {
      const x = base.x + i * sx;
      const y = base.y + j * sy;
      candidates.push({ x, y, d: Math.hypot(i * sx, j * sy) + (i < 0 ? 1 : 0) });
    }
  }
  candidates.sort((a, b) => a.d - b.d);
  return candidates.find((c) => !hits(c.x, c.y)) || base;
}

/** 画面上のカード（枠の要素）を一覧で取り出す。年の古い順 */
export function listCards(elements) {
  return elements
    .filter((el) => !el.isDeleted && el.type === "rectangle" && el.customData?.kind === CARD_KIND)
    .map((el) => ({ ...el.customData, elementId: el.id, groupId: el.groupIds?.[0] }))
    .sort((a, b) => {
      const ay = a.year ?? 99999;
      const by = b.year ?? 99999;
      return (
        ay - by ||
        (a.month ?? 0) - (b.month ?? 0) ||
        (a.day ?? 0) - (b.day ?? 0) ||
        a.title.localeCompare(b.title, "ja")
      );
    });
}

export function findCardIdInSelection(elements, selectedIds) {
  const ids = Object.keys(selectedIds || {}).filter((id) => selectedIds[id]);
  if (!ids.length) return null;
  const byId = new Map(elements.map((el) => [el.id, el]));
  const cardIds = new Set();
  for (const id of ids) {
    const cid = byId.get(id)?.customData?.cardId;
    if (cid) cardIds.add(cid);
  }
  return cardIds.size === 1 ? [...cardIds][0] : null;
}
