// ③ あの頃の空：国土地理院の年代別空中写真
// 地域によって写真がある年代・ない年代がある。カードの場所で実際にタイルが読めるか確かめてから選ぶ。
import { L, GSI_ATTRIBUTION } from "./mapCommon.js";

const GSI = "https://cyberjapandata.gsi.go.jp/xyz";

export const ERAS = [
  { key: "riku", label: "1936〜1942年ごろ", from: 1936, to: 1942, id: "ort_riku10", ext: "png", minZoom: 12, note: "一部の都市のみ" },
  { key: "usa", label: "1945〜1950年", from: 1945, to: 1950, id: "ort_USA10", ext: "png", minZoom: 12, note: "主に都市部・米軍撮影" },
  { key: "old", label: "1961〜1969年", from: 1961, to: 1969, id: "ort_old10", ext: "png", minZoom: 10, note: "" },
  { key: "g1", label: "1974〜1978年", from: 1974, to: 1978, id: "gazo1", ext: "jpg", minZoom: 10, note: "ほぼ全国" },
  { key: "g2", label: "1979〜1983年", from: 1979, to: 1983, id: "gazo2", ext: "jpg", minZoom: 12, note: "一部地域" },
  { key: "g3", label: "1984〜1986年", from: 1984, to: 1986, id: "gazo3", ext: "jpg", minZoom: 12, note: "一部地域" },
  { key: "g4", label: "1987〜1990年", from: 1987, to: 1990, id: "gazo4", ext: "jpg", minZoom: 12, note: "一部地域" },
  { key: "now", label: "現在", from: 2007, to: 9999, id: "seamlessphoto", ext: "jpg", minZoom: 5, note: "" },
];

export const eraByKey = (key) => ERAS.find((e) => e.key === key) || null;

export function eraLayer(era) {
  return L.tileLayer(`${GSI}/${era.id}/{z}/{x}/{y}.${era.ext}`, {
    attribution: GSI_ATTRIBUTION,
    minZoom: era.minZoom,
    maxNativeZoom: era.key === "now" ? 18 : 17,
    maxZoom: 18,
    crossOrigin: true,
    zIndex: 5,
  });
}

/** その年に近い順に年代を並べる（年が範囲内なら距離0） */
export function erasNearYear(year) {
  return [...ERAS]
    .map((e) => ({ e, d: year < e.from ? e.from - year : year > e.to ? year - e.to : 0 }))
    .sort((a, b) => a.d - b.d || b.e.from - a.e.from)
    .map((x) => x.e);
}

function tileXY(lat, lng, z) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return { x, y };
}

function canLoad(url, ms = 5000) {
  return new Promise((resolve) => {
    const img = new Image();
    const t = setTimeout(() => resolve(false), ms);
    img.onload = () => {
      clearTimeout(t);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(t);
      resolve(false);
    };
    img.src = url;
  });
}

/**
 * その場所・その年に一番近い「写真がある年代」を探す。
 * 年が分からなければ一番古いものから探す。見つからなければ「現在」。
 */
export async function findSkyFor(lat, lng, year) {
  const order = year ? erasNearYear(year) : [...ERAS];
  const { x, y } = tileXY(lat, lng, 15);
  for (const era of order) {
    if (era.key === "now") return era;
    if (await canLoad(`${GSI}/${era.id}/15/${x}/${y}.${era.ext}`)) return era;
  }
  return eraByKey("now");
}
