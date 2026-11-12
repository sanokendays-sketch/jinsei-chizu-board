// アプリ全体：ボードの目次を持ち、いま開いているボードを表示する
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import Board from "./Board.jsx";
import { templateById } from "./templates.js";
import {
  deleteBoardData,
  loadBoard,
  loadIndex,
  newBoardId,
  saveIndex,
  writeBoardData,
} from "./storage.js";

const BoardsDialog = lazy(() => import("./BoardsDialog.jsx"));

export default function App() {
  const [index, setIndex] = useState(null);
  const [opened, setOpened] = useState(null); // { id, data }
  const [boardsOpen, setBoardsOpen] = useState(false);

  // 目次を変えて保存する
  const changeIndex = useCallback((fn) => {
    setIndex((prev) => {
      const next = fn(prev);
      saveIndex(next).catch(() => {});
      return next;
    });
  }, []);

  const open = useCallback(async (id) => {
    const data = await loadBoard(id);
    setOpened({ id, data });
  }, []);

  useEffect(() => {
    (async () => {
      const idx = await loadIndex();
      setIndex(idx);
      await open(idx.current);
    })();
  }, [open]);

  const switchTo = async (id) => {
    setBoardsOpen(false);
    changeIndex((idx) => ({ ...idx, current: id }));
    setOpened(null); // いまのボードを閉じる（閉じるときに保存される）
    await new Promise((r) => setTimeout(r, 50));
    await open(id);
  };

  const create = async (templateId, title, data = null) => {
    const id = newBoardId();
    const now = Date.now();
    const cards = data ? data.elements.filter((el) => el.customData?.kind === "memory").length : 0;
    if (data) {
      await writeBoardData(id, { elements: data.elements, files: data.files || {}, appState: {}, meta: data.meta || {} });
    }
    changeIndex((idx) => ({
      ...idx,
      boards: [...idx.boards, { id, title, templateId, createdAt: now, updatedAt: now, cards }],
    }));
    await switchTo(id);
  };

  const onSaved = useCallback(
    (cards) => {
      if (!opened) return;
      changeIndex((idx) => ({
        ...idx,
        boards: idx.boards.map((b) => (b.id === opened.id ? { ...b, updatedAt: Date.now(), cards } : b)),
      }));
    },
    [opened, changeIndex],
  );

  if (!index || !opened) {
    return <div className="loading-screen">🗺️ 読み込んでいます…</div>;
  }

  const board = index.boards.find((b) => b.id === opened.id) || index.boards[0];
  const template = templateById(board.templateId);

  return (
    <>
      <Board
        key={board.id}
        board={board}
        template={template}
        initial={opened.data}
        onSaved={onSaved}
        onOpenBoards={() => setBoardsOpen(true)}
        onImportAsNew={(data) =>
          create(data.board?.templateId || "jinsei", data.board?.title || "読み込んだボード", data)
        }
      />
      {boardsOpen && (
        <Suspense fallback={null}>
          <BoardsDialog
            index={index}
            onClose={() => setBoardsOpen(false)}
            onSwitch={switchTo}
            onCreate={(templateId, title) => create(templateId, title)}
            onRename={(id, title) =>
              changeIndex((idx) => ({ ...idx, boards: idx.boards.map((b) => (b.id === id ? { ...b, title } : b)) }))
            }
            onDelete={async (id) => {
              await deleteBoardData(id).catch(() => {});
              changeIndex((idx) => ({ ...idx, boards: idx.boards.filter((b) => b.id !== id) }));
            }}
          />
        </Suspense>
      )}
    </>
  );
}
