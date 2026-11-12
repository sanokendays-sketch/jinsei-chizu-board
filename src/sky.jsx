// ③ あの頃の空：地図に年代別空中写真を重ねる部品（地図画面と場所選びで共通）
import { useEffect, useRef, useState } from "react";
import { ERAS, eraByKey, eraLayer } from "./eras.js";

/** 地図(mapRef)に年代の写真を重ねる。ready は地図ができたら true */
export function useSkyOverlay(mapRef, ready) {
  const [eraKey, setEraKey] = useState(null);
  const [zoom, setZoom] = useState(null);
  const layerRef = useRef(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);
    onZoom();
    return () => {
      try {
        map.off("zoomend", onZoom);
      } catch {
        /* 地図が先に片付いている */
      }
    };
  }, [mapRef, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    layerRef.current?.remove();
    layerRef.current = null;
    const era = eraByKey(eraKey);
    if (era) layerRef.current = eraLayer(era).addTo(map);
  }, [mapRef, ready, eraKey]);

  return { eraKey, setEraKey, zoom, era: eraByKey(eraKey) };
}

export function SkySelect({ eraKey, setEraKey }) {
  return (
    <label className="sky-select">
      <span aria-hidden>🕰</span>
      <select value={eraKey || ""} onChange={(e) => setEraKey(e.target.value || null)} aria-label="あの頃の空">
        <option value="">あの頃の空：なし</option>
        {ERAS.map((e) => (
          <option key={e.key} value={e.key}>
            {e.key === "now" ? "現在の写真" : `${e.label}の写真`}
            {e.note ? `（${e.note}）` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SkyBanner({ era, zoom, message, onClose }) {
  if (!era && !message) return null;
  const tooFar = era && zoom != null && zoom < era.minZoom;
  return (
    <div className="sky-banner" role="status">
      <div className="sky-banner-text">
        {era && (
          <b>
            🕰 {era.key === "now" ? "現在の空中写真" : `${era.label}の空中写真`}
            {era.key === "usa" ? "（米軍撮影）" : ""}
          </b>
        )}
        {message && <div>{message}</div>}
        {era && (
          <div className="sky-sub">
            {tooFar
              ? "＋ボタンで近づくと写真が見えます"
              : era.key === "now"
                ? "国土地理院の写真です"
                : "写真が出ない所は、その年代の撮影がない場所です"}
          </div>
        )}
      </div>
      <button type="button" className="sky-close" aria-label="写真を消す" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
