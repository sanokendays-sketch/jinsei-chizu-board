// ④ 年表画面：カードを年代ごとに縦に並べる。人生系のテンプレートでは年齢も出す
import { whenLabel } from "./cards.js";

const hasLoc = (c) => Number.isFinite(c?.lat) && Number.isFinite(c?.lng);
const BIRTH_RE = /誕生|生まれ/;

/** 生年：手で入れた値があればそれ、なければ「誕生」「生まれ」を含むカードから */
export function findBirth(meta, cards, template) {
  if (!template?.age) return null;
  if (meta?.birthYear) return { year: Number(meta.birthYear), month: null, day: null, source: "manual" };
  const b = cards.find((c) => c.year && BIRTH_RE.test(c.title));
  return b ? { year: b.year, month: b.month, day: b.day, source: "card", cardId: b.cardId } : null;
}

export function ageAt(birth, c) {
  if (!birth || !c.year || c.cardId === birth.cardId) return null;
  let age = c.year - birth.year;
  let exact = false;
  if (c.month && birth.month) {
    exact = true;
    if (c.month < birth.month || (c.month === birth.month && c.day && birth.day && c.day < birth.day)) age -= 1;
  }
  if (age < 0) return null;
  return exact ? `${age}歳` : `${age}歳ごろ`;
}

function decadeOf(c) {
  return c.year ? Math.floor(c.year / 10) * 10 : null;
}

export default function TimelineView({ cards, files, template, meta, setMeta, title, onOpen, onEdit, onAdd, onSample }) {
  const birth = findBirth(meta, cards, template);
  const groups = [];
  for (const c of cards) {
    const d = decadeOf(c);
    const label = d === null ? "年がわからないもの" : `${d}年代`;
    if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, items: [] });
    groups[groups.length - 1].items.push(c);
  }

  return (
    <div className="timeline">
      <div className="tl-inner">
        <header className="tl-head">
          <h1 className="tl-title">
            {template.icon} {title}
          </h1>
          <div className="tl-count">カード {cards.length}枚</div>
          {template.age && (
            <label className="tl-birth">
              <span>{template.age.label}</span>
              <input
                type="number"
                inputMode="numeric"
                min="1900"
                max={new Date().getFullYear()}
                placeholder={birth?.source === "card" ? String(birth.year) : "例：1971"}
                value={meta?.birthYear ?? ""}
                onChange={(e) => setMeta({ ...meta, birthYear: e.target.value ? Number(e.target.value) : null })}
              />
              <span>年</span>
              <small>
                {birth?.source === "card" && !meta?.birthYear
                  ? "「誕生」のカードから読み取りました"
                  : template.age.hint}
              </small>
            </label>
          )}
        </header>

        {cards.length === 0 ? (
          <div className="tl-empty">
            <p>まだカードがありません。</p>
            <div className="tl-empty-actions">
              {onSample && (
                <button className="btn btn-primary" onClick={onSample}>
                  📖 見本の人生を入れてみる
                </button>
              )}
              <button className={onSample ? "btn" : "btn btn-primary"} onClick={onAdd}>
                ＋ {template.addLabel}を書く
              </button>
            </div>
          </div>
        ) : (
          groups.map((g) => (
            <section className="tl-decade" key={g.label}>
              <h2>{g.label}</h2>
              <ol>
                {g.items.map((c) => {
                  const photo = c.fileId && files?.[c.fileId]?.dataURL;
                  const age = ageAt(birth, c);
                  return (
                    <li className="tl-item" key={c.cardId}>
                      <div className="tl-when">
                        <b>{c.year ?? "—"}</b>
                        <span>{c.year ? whenLabel(c).replace(/^\d+年/, "") : ""}</span>
                        {age && <span className="tl-age">{age}</span>}
                      </div>
                      <div className="tl-dot" style={{ borderColor: template.palette.border }} aria-hidden />
                      <div className="tl-body">
                        {photo && <img className="tl-photo" src={photo} alt="" />}
                        <div className="tl-text">
                          <div className="tl-card-title">{c.title}</div>
                          {c.place && <div className="tl-place">📍 {c.place}</div>}
                          {c.note && <p className="tl-note">{c.note}</p>}
                          <div className="tl-actions">
                            <button className="btn btn-small" onClick={() => onOpen(c, "board")}>
                              🗒 ボード
                            </button>
                            {hasLoc(c) && (
                              <button className="btn btn-small" onClick={() => onOpen(c, "map")}>
                                🗾 地図
                              </button>
                            )}
                            <button className="btn btn-small" onClick={() => onEdit(c.cardId)}>
                              ✏️ 編集
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        )}
        <footer className="tl-foot">人生地図ボード — 地図：国土地理院（地理院タイル）</footer>
      </div>
    </div>
  );
}
