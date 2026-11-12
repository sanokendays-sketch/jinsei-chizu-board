// 地図画面：場所の入ったカードをピンで並べ、年の順に線でつなぐ。③で「あの頃の空」を重ねられる
import { useEffect, useRef, useState } from "react";
import { L, createMap, hasLocation, JAPAN } from "./mapCommon.js";
import { whenLabel } from "./cards.js";
import { findSkyFor } from "./eras.js";
import { SkyBanner, SkySelect, useSkyOverlay } from "./sky.jsx";

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

function popupContent(group, files, handlers) {
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
          <button type="button" data-act="sky" class="pop-sky">🕰 この頃の空</button>
          <button type="button" data-act="board">ボードで見る</button>
          <button type="button" data-act="edit">編集</button>
        </div>
      </div>`;
    item.querySelector('[data-act="sky"]').addEventListener("click", () => handlers.onSky(c));
    item.querySelector('[data-act="board"]').addEventListener("click", () => handlers.onOpenBoard(c));
    item.querySelector('[data-act="edit"]').addEventListener("click", () => handlers.onEdit(c.cardId));
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
  const [ready, setReady] = useState(false);
  const [showLine, setShowLine] = useState(true);
  const [skyMessage, setSkyMessage] = useState("");
  const sky = useSkyOverlay(mapRef, ready);

  // 地図をつくる（画面を開いたとき1回だけ）
  useEffect(() => {
    const map = createMap(elRef.current, { layerKey: "pale" });
    mapRef.current = map;
    groupRef.current = L.layerGroup().addTo(map);
    setReady(true);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ピンの「この頃の空」：その場所で写真がある一番近い年代を探して重ねる
  const showSkyFor = async (c) => {
    const map = mapRef.current;
    if (!map) return;
    map.closePopup();
    setSkyMessage("写真を探しています…");
    map.flyTo([c.lat, c.lng], Math.max(16, map.getZoom()), { duration: 0.8 });
    const era = await findSkyFor(c.lat, c.lng, c.year);
    sky.setEraKey(era.key);
    if (era.key === "now" && c.year && c.year < 2000) {
      setSkyMessage(`この場所の${c.year}年ごろの写真は見つからなかったので、現在の写真を出しています`);
    } else if (c.year && era.key !== "now" && (c.year < era.from || c.year > era.to)) {
      setSkyMessage(`「${c.title}」（${c.year}年）に一番近い年代の写真です`);
    } else {
      setSkyMessage(`「${c.title}」の頃の写真です`);
    }
  };

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
        { color: "#c0641f", weight: 3, opacity: 0.7, dashArray: "6 8", interactive: false },
      ).addTo(layer);
    }

    const handlers = { onOpenBoard, onEdit, onSky: showSkyFor };
    for (const group of groups.values()) {
      const m = L.marker([group[0].lat, group[0].lng], { icon: pinIcon(group), riseOnHover: true, zIndexOffset: 1000 });
      m.bindPopup(() => popupContent(group, files, handlers), { maxWidth: 300, minWidth: 230 });
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
  }, [cards, files, showLine, ready]);

  // 一覧から選ばれたカードへ移動
  useEffect(() => {
    if (!ready || !focusId?.id) return;
    const map = mapRef.current;
    const m = markersRef.current.get(focusId.id);
    if (m && map) {
      map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 14), { duration: 0.8 });
      // ピンは描き直されることがあるので、開く直前に探し直す
      setTimeout(() => markersRef.current.get(focusId.id)?.openPopup(), 900);
    }
  }, [focusId, ready]);

  const skyOn = Boolean(sky.era) || Boolean(skyMessage);

  return (
    <div className="mapview">
      <div ref={elRef} className="mapview-map" />
      <div className="map-tools">
        <SkySelect
          eraKey={sky.eraKey}
          setEraKey={(k) => {
            setSkyMessage("");
            sky.setEraKey(k);
          }}
        />
        {located.length > 1 && (
          <button className="btn btn-small" onClick={() => setShowLine((s) => !s)}>
            {showLine ? "〰 線を消す" : "〰 年の順に線でつなぐ"}
          </button>
        )}
      </div>
      {skyOn ? (
        <SkyBanner
          era={sky.era}
          zoom={sky.zoom}
          message={skyMessage}
          onClose={() => {
            setSkyMessage("");
            sky.setEraKey(null);
          }}
        />
      ) : located.length === 0 ? (
        <div className="map-note">
          まだ地図に置いたカードがありません。
          <br />
          カードの「編集」→「🗾 地図で場所を選ぶ」で指定できます。
        </div>
      ) : (
        unlocated > 0 && <div className="map-note small">場所が未設定のカード：{unlocated}枚</div>
      )}
    </div>
  );
}
