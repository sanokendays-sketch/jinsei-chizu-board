// 地図画面：場所の入ったカードをピンで並べ、年の順に線でつなぐ
import { useEffect, useRef, useState } from "react";
import { L, createMap, hasLocation, JAPAN } from "./mapCommon.js";
import { whenLabel } from "./cards.js";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// 同じ場所(約10m以内)のカードはひとつのピンにまとめる
const spotKey = (c) => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;

function pinIcon(group) {
  const first = group[0];
  const label = first.year ? String(first.year) : "？";
  const count = group.length > 1 ? `<b class="pin-count">${group.length}</b>` : "";
  return L.divIcon({
    className: "pin-wrap",
    html: `<div class="pin">${esc(label)}${count}</div>`,
    iconSize: [64, 34],
    iconAnchor: [32, 38],
    popupAnchor: [0, -36],
  });
}

function popupContent(group, files, onOpenBoard, onEdit) {
  const box = document.createElement("div");
  box.className = "pop";
  for (const c of group) {
    const item = document.createElement("div");
    item.className = "pop-item";
    const photo = c.fileId && files?.[c.fileId]?.dataURL;
    item.innerHTML = `
      ${photo ? `<img class="pop-photo" src="${photo}" alt="">` : ""}
      <div class="pop-text">
        <div class="pop-when">${esc(whenLabel(c))}</div>
        <div class="pop-title">${esc(c.title)}</div>
        ${c.place ? `<div class="pop-place">📍 ${esc(c.place)}</div>` : ""}
        <div class="pop-actions">
          <button type="button" data-act="board">ボードで見る</button>
          <button type="button" data-act="edit">編集</button>
        </div>
      </div>`;
    item.querySelector('[data-act="board"]').addEventListener("click", () => onOpenBoard(c));
    item.querySelector('[data-act="edit"]').addEventListener("click", () => onEdit(c.cardId));
    box.appendChild(item);
  }
  return box;
}

export default function MapView({ cards, files, focusId, onOpenBoard, onEdit }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const groupRef = useRef(null);
  const markersRef = useRef(new Map());
  const fittedRef = useRef(false);
  const [showLine, setShowLine] = useState(true);

  // 地図をつくる（画面を開いたとき1回だけ）
  useEffect(() => {
    const map = createMap(elRef.current, { layerKey: "pale" });
    mapRef.current = map;
    groupRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // カードが変わるたびにピンと線を描き直す
  const located = cards.filter(hasLocation);
  const unlocated = cards.length - located.length;
  useEffect(() => {
    const map = mapRef.current;
    const layer = groupRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current = new Map();

    const groups = new Map();
    for (const c of located) {
      const k = spotKey(c);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c);
    }

    if (showLine && located.length > 1) {
      L.polyline(
        located.map((c) => [c.lat, c.lng]),
        { color: "#c0641f", weight: 3, opacity: 0.6, dashArray: "6 8", interactive: false },
      ).addTo(layer);
    }

    for (const group of groups.values()) {
      const m = L.marker([group[0].lat, group[0].lng], { icon: pinIcon(group), riseOnHover: true });
      m.bindPopup(() => popupContent(group, files, onOpenBoard, onEdit), { maxWidth: 280, minWidth: 220 });
      m.addTo(layer);
      for (const c of group) markersRef.current.set(c.cardId, m);
    }

    if (!fittedRef.current) {
      fittedRef.current = true;
      if (located.length === 1) map.setView([located[0].lat, located[0].lng], 13);
      else if (located.length > 1)
        map.fitBounds(L.latLngBounds(located.map((c) => [c.lat, c.lng])), { padding: [48, 48], maxZoom: 13 });
      else map.setView(JAPAN.center, JAPAN.zoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, files, showLine]);

  // 一覧から選ばれたカードへ移動
  useEffect(() => {
    if (!focusId?.id) return;
    const m = markersRef.current.get(focusId.id);
    const map = mapRef.current;
    if (m && map) {
      map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 14), { duration: 0.8 });
      setTimeout(() => m.openPopup(), 850);
    }
  }, [focusId]);

  return (
    <div className="mapview">
      <div ref={elRef} className="mapview-map" />
      <div className="map-tools">
        <button className="btn btn-small" onClick={() => setShowLine((s) => !s)}>
          {showLine ? "〰 線を消す" : "〰 年の順に線でつなぐ"}
        </button>
      </div>
      {located.length === 0 ? (
        <div className="map-note">
          まだ地図に置いたカードがありません。
          <br />
          カードの「編集」→「🗺 地図で場所を選ぶ」で指定できます。
        </div>
      ) : (
        unlocated > 0 && <div className="map-note small">場所が未設定のカード：{unlocated}枚</div>
      )}
    </div>
  );
}
