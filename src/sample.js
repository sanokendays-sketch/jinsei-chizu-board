// 見本のライフストーリー（架空の人物）。白紙だと何を書けばいいか迷うので、
// 「こんなふうに書けばいいのか」とイメージできるように入れる。あとでまとめて消せる。
import { convertToExcalidrawElements, FONT_FAMILY } from "@excalidraw/excalidraw";
import { buildCardElements, cardData, newId, shiftElements } from "./cards.js";

export const SAMPLE_LIFE = [
  {
    year: 1971, month: 5, day: 12, title: "誕生",
    place: "福島県郡山市", lat: 37.3985, lng: 140.388,
    note: "3,200グラムの男の子。祖母が赤飯を炊いて、近所に配ってくれたそうだ。\n（見本）カードをタップ →「編集」で、自分の話に書き換えられます。",
  },
  {
    year: 1978, month: 4, title: "小学校に入学",
    place: "郡山市開成", lat: 37.3957, lng: 140.3712,
    note: "ランドセルが大きすぎて、後ろにひっくり返りそうだった。桜の下で撮った写真が今もアルバムにある。",
  },
  {
    year: 1984, month: 4, title: "中学校に入学",
    place: "郡山市桑野", lat: 37.3925, lng: 140.3655,
    note: "野球部に入った。坊主頭に冬の風がしみた。",
  },
  {
    year: 1987, month: 4, title: "高校に入学",
    place: "福島市（汽車で通学）", lat: 37.7543, lng: 140.4597,
    note: "毎朝6時50分の汽車で通った。帰りの駅で食べる立ち食いそばがごちそうだった。",
  },
  {
    year: 1990, month: 4, title: "大学に入学・一人暮らし",
    place: "仙台市青葉区川内", lat: 38.259, lng: 140.859,
    note: "6畳一間のアパート。初めての自炊はカレー。3日続けて食べた。",
  },
  {
    year: 1994, month: 4, day: 1, title: "就職",
    place: "仙台駅前", lat: 38.2601, lng: 140.8822,
    note: "入社式で緊張して、あいさつの声が裏返った。初任給で両親に食事をごちそうした。",
  },
  {
    year: 1998, month: 10, title: "結婚",
    place: "宮城県松島町", lat: 38.369, lng: 141.0647,
    note: "海の見える式場で。親戚が多くて、席順を決めるのに一晩かかった。",
  },
  {
    year: 2000, month: 7, title: "長女が生まれる",
    place: "仙台市宮城野区", lat: 38.2575, lng: 140.901,
    note: "夜中のミルクは夫婦で交代。初めて「パパ」と呼ばれた日、会社で自慢した。",
  },
  {
    year: 2003, month: 3, title: "長男が生まれる",
    place: "仙台市泉区", lat: 38.3263, lng: 140.8808,
    note: "お姉ちゃんが毎日、弟の顔をのぞきこんでいた。",
  },
  {
    year: 2008, month: 4, title: "転勤で盛岡へ",
    place: "岩手県盛岡市", lat: 39.7016, lng: 141.1365,
    note: "家族4人で引っ越し。最初の冬、水道管が凍って大騒ぎになった。",
  },
  {
    year: 2015, month: 4, title: "仙台に戻り、家を建てる",
    place: "仙台市太白区長町", lat: 38.2266, lng: 140.886,
    note: "35年ローン。小さな庭に、子どもたちと柿の木を植えた。",
  },
  {
    year: 2021, month: 5, title: "50歳。新しいことを始める",
    place: "仙台市太白区", lat: 38.2185, lng: 140.8768,
    note: "スマホで写真の整理を始めた。昔の写真を見ながら、この人生地図を作り始めた。",
  },
];

export const SAMPLES = { jinsei: SAMPLE_LIFE };
export const hasSampleFor = (template) => Boolean(SAMPLES[template?.id]);
export const isSampleElement = (el) => !el.isDeleted && el.customData?.sample === true;

const GAP_X = 36;
const LABEL_H = 56;
const ROW_GAP = 70;

/**
 * 見本のカードを、年代ごとの行に並べた要素の束にする。
 * すべての要素に customData.sample = true を付けておき、「見本を消す」で一度に消せるようにする。
 * 見本のカードを編集すると、そのカードは見本ではなく「自分のカード」になる。
 */
export async function buildSampleElements(template, origin = { x: 60, y: 140 }) {
  const items = SAMPLES[template.id] || [];
  const rows = [];
  for (const s of items) {
    const decade = Math.floor(s.year / 10) * 10;
    if (!rows.length || rows[rows.length - 1].decade !== decade) rows.push({ decade, cards: [] });
    rows[rows.length - 1].cards.push(s);
  }

  const out = [];
  let y = origin.y;
  for (const row of rows) {
    const [label] = convertToExcalidrawElements(
      [
        {
          type: "text",
          x: origin.x,
          y,
          text: `${row.decade}年代`,
          fontSize: 30,
          fontFamily: FONT_FAMILY.Helvetica,
          strokeColor: template.palette.year,
        },
      ],
      { regenerateIds: true },
    );
    out.push({ ...label, customData: { sample: true, role: "decade" } });

    let x = origin.x;
    let rowHeight = 0;
    for (const s of row.cards) {
      const card = { ...cardData({ ...s, cardId: newId() }), sample: true };
      let els = await buildCardElements(card, 0, 0, null, template.palette);
      els = shiftElements(els, x, y + LABEL_H).map((el) => ({
        ...el,
        customData: { ...el.customData, sample: true },
      }));
      out.push(...els);
      x += els[0].width + GAP_X;
      rowHeight = Math.max(rowHeight, els[0].height);
    }
    y += LABEL_H + rowHeight + ROW_GAP;
  }
  return out;
}
