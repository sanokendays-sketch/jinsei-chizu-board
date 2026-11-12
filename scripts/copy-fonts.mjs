// Excalidrawのフォントを public/fonts にコピーする（外部CDNに頼らず自前で配信するため）
// 中国語・日本語の手書き風フォント(Xiaolai, 約13MB)は既定では入れない。
// 入れたいときは: INCLUDE_CJK_FONT=1 npm run build
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
const src = "node_modules/@excalidraw/excalidraw/dist/prod/fonts";
const dest = "public/fonts";
const withCjk = process.env.INCLUDE_CJK_FONT === "1";
rmSync(dest, { recursive: true, force: true });
for (const dir of readdirSync(src)) {
  if (dir === "Xiaolai" && !withCjk) continue;
  cpSync(`${src}/${dir}`, `${dest}/${dir}`, { recursive: true });
}
console.log(`fonts copied -> ${dest}${withCjk ? " (CJK含む)" : ""}`);
