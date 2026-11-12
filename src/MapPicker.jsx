// カードの場所を地図で選ぶ画面：住所で探す → 地図をタップして微調整 → 決定
import { useEffect, useRef, useState } from "react";
import { L, createMap, searchPlace } from "./mapCommon.js";
import { SkyBanner, SkySelect, useSkyOverlay } from "./sky.jsx";

const pickIcon = L.divIcon({
  className: "pin-wrap",
  html: '<div class="pick-pin">📍</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 38],
});

export default function MapPicker({ initial, query, onPick, onClose }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [q, setQ] = useState(query || "");
  const [picked, setPicked] = useState(initial || null); // {lat, lng, name?}
  const [results, setResults] = useState([]);
  const [source, setSource] = useState(null);
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);
  const sky = useSkyOverlay(mapRef, ready);

  const runSearch = async (text, { autoPick = false } = {}) => {
    if (!text.trim()) return;
    setStatus("探しています…");
    setResults([]);
    const res = await searchPlace(text);
    setSource(res.source);
    if (!res.results.length) {
      setStatus(res.error ? "検索できませんでした。地図を動かしてタップしてください" : "見つかりませんでした");
      return;
    }
    setStatus("");
    if (res.results.length === 1) {
      choose(res.results[0]);
    } else if (autoPick) {
      choose(res.results[0]);
      if (res.results.length > 1) setResults(res.results);
    } else {
      setResults(res.results);
    }
  };

  const choose = (r) => {
    setPicked({ lat: r.lat, lng: r.lng, name: r.name });
    setResults([]);
    mapRef.current?.setView([r.lat, r.lng], 14);
  };

  useEffect(() => {
    const map = createMap(elRef.current, { layerKey: "std" });
    mapRef.current = map;
    map.on("click", (e) => setPicked({ lat: e.latlng.lat, lng: e.latlng.lng }));
    if (initial) map.setView([initial.lat, initial.lng], 15);
    else if (query) runSearch(query, { autoPick: true });
    setReady(true);
    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 選んだ場所にピンを立てる（ピンは指でずらせる）
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!picked) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([picked.lat, picked.lng], { icon: pickIcon, draggable: true }).addTo(map);
      markerRef.current.on("dragend", (e) => {
        const ll = e.target.getLatLng();
        setPicked({ lat: ll.lat, lng: ll.lng });
      });
    } else {
      markerRef.current.setLatLng([picked.lat, picked.lng]);
    }
  }, [picked]);

  return (
    <div className="picker">
      <div className="picker-head">
        {/* カード入力フォームの中で開くので、ここでは<form>を使わずEnterキーで検索する */}
        <div className="picker-search">
          <input
            type="search"
            enterKeyHint="search"
            placeholder="住所・地名で探す（例：郡山市）"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.stopPropagation();
                runSearch(q);
              }
            }}
          />
          <button type="button" className="btn" onClick={() => runSearch(q)}>
            探す
          </button>
        </div>
        {status && <div className="picker-status">{status}</div>}
        {results.length > 0 && (
          <ul className="picker-results">
            {results.map((r, i) => (
              <li key={i}>
                <button type="button" onClick={() => choose(r)}>
                  {r.name}
                </button>
              </li>
            ))}
            {source === "osm" && <li className="picker-credit">検索：© OpenStreetMap contributors</li>}
          </ul>
        )}
      </div>
      <div className="picker-mapwrap">
        <div ref={elRef} className="picker-map" />
        {sky.era && <SkyBanner era={sky.era} zoom={sky.zoom} onClose={() => sky.setEraKey(null)} />}
      </div>
      <div className="picker-foot">
        <div className="picker-hint">
          {results.length > 0
            ? "上の候補から選ぶか、地図をタップしてください。"
            : picked
              ? "ピンは指でずらせます。違う場所なら地図をタップ。"
              : "住所で探すか、思い出の場所を地図でタップしてください。"}
        </div>
        <div className="picker-sky">
          <SkySelect eraKey={sky.eraKey} setEraKey={sky.setEraKey} />
          <span className="picker-sky-hint">昔の写真で家を探せます</span>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            やめる
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn-primary" disabled={!picked} onClick={() => onPick(picked)}>
            この場所にする
          </button>
        </div>
      </div>
    </div>
  );
}
