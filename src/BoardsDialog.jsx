// ④ ボードの切り替え・新しいボード（テンプレートから）・名前の変更・削除
import { useState } from "react";
import { TEMPLATES, templateById } from "./templates.js";

const dateLabel = (t) => {
  if (!t) return "";
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()} 更新`;
};

export default function BoardsDialog({ index, onClose, onSwitch, onCreate, onRename, onDelete }) {
  const [mode, setMode] = useState("list"); // list | new
  const [picked, setPicked] = useState(null); // 新しいボードのテンプレート
  const [title, setTitle] = useState("");
  const [renaming, setRenaming] = useState(null); // { id, title }
  const [confirmDelete, setConfirmDelete] = useState(null);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog boards">
        {mode === "list" ? (
          <>
            <h2>ボード</h2>
            <ul className="board-list">
              {index.boards.map((b) => {
                const t = templateById(b.templateId);
                const current = b.id === index.current;
                return (
                  <li key={b.id} className={current ? "current" : ""}>
                    {renaming?.id === b.id ? (
                      <form
                        className="rename"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (renaming.title.trim()) onRename(b.id, renaming.title.trim());
                          setRenaming(null);
                        }}
                      >
                        <input
                          autoFocus
                          value={renaming.title}
                          onChange={(e) => setRenaming({ ...renaming, title: e.target.value })}
                        />
                        <button className="btn btn-small btn-primary" type="submit">
                          決定
                        </button>
                      </form>
                    ) : (
                      <button className="board-open" onClick={() => (current ? onClose() : onSwitch(b.id))}>
                        <span className="board-icon" style={{ background: t.palette.bg, borderColor: t.palette.border }}>
                          {t.icon}
                        </span>
                        <span className="board-text">
                          <b>{b.title}</b>
                          <small>
                            {t.name}・カード{b.cards ?? 0}枚・{dateLabel(b.updatedAt)}
                          </small>
                        </span>
                        {current && <span className="board-now">表示中</span>}
                      </button>
                    )}
                    {renaming?.id !== b.id && (
                      <div className="board-actions">
                        <button className="btn btn-small" onClick={() => setRenaming({ id: b.id, title: b.title })}>
                          名前を変える
                        </button>
                        {!current &&
                          (confirmDelete === b.id ? (
                            <button className="btn btn-small btn-danger" onClick={() => onDelete(b.id)}>
                              本当に削除（元に戻せません）
                            </button>
                          ) : (
                            <button className="btn btn-small btn-ghost-danger" onClick={() => setConfirmDelete(b.id)}>
                              削除
                            </button>
                          ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="dialog-actions">
              <button className="btn btn-primary" onClick={() => setMode("new")}>
                ＋ 新しいボードを作る
              </button>
              <span className="spacer" />
              <button className="btn" onClick={onClose}>
                閉じる
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>新しいボード</h2>
            {!picked ? (
              <>
                <p className="dialog-lead">何を残しますか？ あとから名前は変えられます。</p>
                <ul className="template-list">
                  {TEMPLATES.map((t) => (
                    <li key={t.id}>
                      <button
                        className="template-card"
                        style={{ background: t.palette.bg, borderColor: t.palette.border }}
                        onClick={() => {
                          setPicked(t);
                          setTitle(t.newTitle);
                        }}
                      >
                        <span className="template-icon">{t.icon}</span>
                        <span>
                          <b>{t.name}</b>
                          <small>{t.desc}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="dialog-actions">
                  <button className="btn" onClick={() => setMode("list")}>
                    戻る
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onCreate(picked.id, title.trim() || picked.newTitle);
                }}
              >
                <p className="dialog-lead">
                  {picked.icon} {picked.name}
                </p>
                <label className="field">
                  <span>ボードの名前</span>
                  <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>
                <div className="dialog-actions">
                  <button type="button" className="btn" onClick={() => setPicked(null)}>
                    戻る
                  </button>
                  <span className="spacer" />
                  <button type="submit" className="btn btn-primary">
                    作る
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
