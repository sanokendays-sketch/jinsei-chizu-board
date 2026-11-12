// 地図まわりの共通部品：地理院タイル、出典表示、場所の検索
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// 地理院タイルは「出典の明示」だけで使える。地図が見えている間は常に表示しておく
export const GSI_ATTRIBUTION =
  '出典：<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院（地理院タイル）</a>';

const GSI = "https://cyberjapandata.gsi.go.jp/xyz";
export const BASE_LAYERS = [
  { key: "pale", name: "淡色地図", url: `${GSI}/pale/{z}/{x}/{y}.png` },
  { key: "std", name: "標準地図", url: `${GSI}/std/{z}/{x}/{y}.png` },
  { key: "photo", name: "写真（現在）", url: `${GSI}/seamlessphoto/{z}/{x}/{y}.jpg` },
];

export const JAPAN = { center: [37.6, 138.4], zoom: 5 };

/** 地図をつくる。layerKey で最初に表示する地図を選ぶ */
export function createMap(el, { layerKey = "pale" } = {}) {
  const map = L.map(el, {
    minZoom: 5,
    maxZoom: 18,
    zoomControl: true,
    attributionControl: true,
  });
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
  const layers = {};
  for (const def of BASE_LAYERS) {
    layers[def.name] = L.tileLayer(def.url, {
      attribution: GSI_ATTRIBUTION,
      maxNativeZoom: 18,
      maxZoom: 18,
      crossOrigin: true,
    });
  }
  const first = BASE_LAYERS.find((d) => d.key === layerKey) || BASE_LAYERS[0];
  layers[first.name].addTo(map);
  L.control.layers(layers, null, { position: "topright", collapsed: true }).addTo(map);
  map.setView(JAPAN.center, JAPAN.zoom);
  // 表示直後は大きさがずれることがあるので測り直す
  setTimeout(() => map.invalidateSize(), 0);
  return map;
}

/**
 * 地名・住所で場所を探す。
 * まず国土地理院の検索を使い、だめなら OpenStreetMap(Nominatim) で探す。
 * どちらも無料。地理院の検索は「主に地理院地図用、長期提供の保証なし」とされているため、予備を用意している。
 */
export async function searchPlace(q) {
  const query = q.trim();
  if (!query) return { source: null, results: [] };
  try {
    // 地理院の検索が止まっていると待たされるので、4秒で見切って予備へ
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data) && data.length) {
        return {
          source: "gsi",
          results: data.slice(0, 8).map((f) => ({
            name: f.properties?.title || query,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          })),
        };
      }
    }
  } catch {
    /* 予備の検索へ */
  }
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&countrycodes=jp&accept-language=ja&q=${encodeURIComponent(query)}`,
    );
    if (r.ok) {
      const data = await r.json();
      return {
        source: "osm",
        results: data.map((d) => ({ name: d.display_name, lat: Number(d.lat), lng: Number(d.lon) })),
      };
    }
  } catch {
    /* どちらもだめ */
  }
  return { source: null, results: [], error: true };
}

export const hasLocation = (c) => Number.isFinite(c?.lat) && Number.isFinite(c?.lng);

export { L };
