// 保存まわり：ブラウザ内(IndexedDB)への自動保存と、バックアップファイルの書き出し・読み込み
import { get, set } from "idb-keyval";

const KEY = "jinsei-board:v1";
export const BACKUP_TYPE = "jinsei-board-backup";

/** 画面に残っている要素と、それが使っている写真だけを取り出す */
export function pickScene(elements, files) {
  const alive = elements.filter((el) => !el.isDeleted);
  const used = new Set(alive.filter((el) => el.type === "image").map((el) => el.fileId));
  const keptFiles = {};
  for (const id of used) if (files && files[id]) keptFiles[id] = files[id];
  return { elements: alive, files: keptFiles };
}

export async function loadLocal() {
  try {
    return (await get(KEY)) || null;
  } catch {
    return null;
  }
}

export async function saveLocal(elements, appState, files) {
  const scene = pickScene(elements, files);
  await set(KEY, {
    ...scene,
    appState: {
      viewBackgroundColor: appState.viewBackgroundColor,
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
      zoom: appState.zoom,
    },
    savedAt: Date.now(),
  });
}

export function makeBackup(elements, files) {
  const scene = pickScene(elements, files);
  return JSON.stringify({
    type: BACKUP_TYPE,
    version: 1,
    savedAt: new Date().toISOString(),
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
 * Claudeのアーティファクト内では downloads 機能を使い、
 * 普通のWebサイト(GitHub Pagesなど)ではブラウザのダウンロードを使う。
 */
export async function offerFile(filename, text) {
  const claude = typeof window !== "undefined" ? window.claude : undefined;
  if (claude && typeof claude.use === "function") {
    const downloads = await claude.use("downloads");
    if (downloads) {
      await downloads.save({ filename, data: text });
      return "saved";
    }
  }
  const blob = new Blob([text], { type: "application/json" });
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
