// 保存まわり：ブラウザ内(IndexedDB)への自動保存と、バックアップファイルの書き出し・読み込み
// ④からボードを複数持てる形にした。①〜③の保存データ(jinsei-board:v1)は「私の人生地図」として引き継ぎ、元のデータも消さずに残す。
import { del, get, set } from "idb-keyval";

const OLD_KEY = "jinsei-board:v1";
const INDEX_KEY = "jinsei:boards";
const boardKey = (id) => `jinsei:board:${id}`;
export const BACKUP_TYPE = "jinsei-board-backup";

export const newBoardId = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** 画面に残っている要素と、それが使っている写真だけを取り出す */
export function pickScene(elements, files) {
  const alive = elements.filter((el) => !el.isDeleted);
  const used = new Set(alive.filter((el) => el.type === "image").map((el) => el.fileId));
  const keptFiles = {};
  for (const id of used) if (files && files[id]) keptFiles[id] = files[id];
  return { elements: alive, files: keptFiles };
}

/**
 * ボードの目次を読む。初めてなら作る。
 * 目次 = { current: ボードID, boards: [{ id, title, templateId, createdAt, updatedAt, cards }] }
 */
export async function loadIndex() {
  let index = null;
  try {
    index = await get(INDEX_KEY);
  } catch {
    index = null;
  }
  if (index?.boards?.length) {
    if (!index.boards.some((b) => b.id === index.current)) index.current = index.boards[0].id;
    return index;
  }
  // 初回：①〜③のデータがあれば引き継ぐ
  const now = Date.now();
  const id = newBoardId();
  let old = null;
  try {
    old = await get(OLD_KEY);
  } catch {
    old = null;
  }
  const cards = old ? old.elements.filter((el) => el.customData?.kind === "memory").length : 0;
  index = { current: id, boards: [{ id, title: "私の人生地図", templateId: "jinsei", createdAt: now, updatedAt: now, cards }] };
  try {
    if (old) await set(boardKey(id), { ...old, meta: old.meta || {} });
    await set(INDEX_KEY, index);
  } catch {
    /* 保存できない環境でも、画面は動かす */
  }
  return index;
}

export async function saveIndex(index) {
  await set(INDEX_KEY, index);
}

export async function loadBoard(id) {
  try {
    return (await get(boardKey(id))) || null;
  } catch {
    return null;
  }
}

export async function saveBoard(id, elements, appState, files, meta) {
  const scene = pickScene(elements, files);
  await set(boardKey(id), {
    ...scene,
    appState: {
      viewBackgroundColor: appState.viewBackgroundColor,
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
      zoom: appState.zoom,
    },
    meta: meta || {},
    savedAt: Date.now(),
  });
  return scene.elements.filter((el) => el.customData?.kind === "memory").length;
}

/** バックアップ・テンプレートから作るボードの中身をそのまま書き込む */
export async function writeBoardData(id, data) {
  await set(boardKey(id), { ...data, savedAt: Date.now() });
}

export async function deleteBoardData(id) {
  await del(boardKey(id));
}

export function makeBackup(elements, files, board, meta) {
  const scene = pickScene(elements, files);
  return JSON.stringify({
    type: BACKUP_TYPE,
    version: 2,
    savedAt: new Date().toISOString(),
    board: board ? { title: board.title, templateId: board.templateId } : null,
    meta: meta || {},
    ...scene,
  });
}

export function parseBackup(text) {
  const data = JSON.parse(text);
  if (data?.type !== BACKUP_TYPE || !Array.isArray(data.elements)) {
    throw new Error("人生地図ボードのバックアップファイルではありません");
  }
  return data;
}

/**
 * ファイルとして渡す。
 * スマホで共有シートが使えるならそれを使い（「ファイルに保存」やLINEなどへ送れる）、
 * だめならブラウザのダウンロード。Claudeのアーティファクト内では downloads 機能を使う。
 */
export async function offerFile(filename, data, mime = "application/json") {
  const claude = typeof window !== "undefined" ? window.claude : undefined;
  if (claude && typeof claude.use === "function") {
    const downloads = await claude.use("downloads");
    if (downloads) {
      await downloads.save({ filename, data });
      return "saved";
    }
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const file = new File([blob], filename, { type: mime });
  const touch = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (e) {
      if (e?.name === "AbortError") throw Object.assign(new Error("declined"), { code: "declined" });
      /* 共有できなければダウンロードへ */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "saved";
}
