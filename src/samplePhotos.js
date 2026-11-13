// 見本の人生に添える「架空の写真」。すべてこのアプリのために描いたオリジナルのイラスト(SVG)。
// 昔のプリント写真のように、白いふち・年代ごとの色あせ・オレンジの日付を付けている。

const W = 480;
const H = 360;

// 年代ごとの色味（feColorMatrix）
const TONES = {
  "70s": "0.86 0.18 0.06 0 0.05  0.1 0.78 0.1 0 0.04  0.06 0.12 0.6 0 0.03  0 0 0 1 0",
  "80s": "0.97 0.08 0.02 0 0.03  0.04 0.93 0.04 0 0.02  0.02 0.06 0.84 0 0.01  0 0 0 1 0",
  "90s": "1 0.04 0 0 0.02  0.02 0.97 0.02 0 0.01  0 0.03 0.93 0 0  0 0 0 1 0",
};

function photo(scene, { tone, stamp } = {}) {
  const filter = tone ? `<filter id="tone"><feColorMatrix type="matrix" values="${TONES[tone]}"/></filter>` : "";
  const stampText = stamp
    ? `<text x="452" y="334" text-anchor="end" font-family="'Courier New',monospace" font-size="21" font-weight="700" fill="#ff7b22" fill-opacity="0.92" letter-spacing="1.5">${stamp}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>${filter}
<radialGradient id="vig" cx="50%" cy="50%" r="70%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#2a1a05" stop-opacity="${tone ? 0.32 : 0.12}"/></radialGradient>
<clipPath id="c"><rect x="14" y="14" width="452" height="332" rx="3"/></clipPath></defs>
<rect width="${W}" height="${H}" fill="#fbf8f1"/>
<g clip-path="url(#c)"><g${tone ? ' filter="url(#tone)"' : ""}>${scene}</g><rect x="14" y="14" width="452" height="332" fill="url(#vig)"/></g>
<rect x="14.5" y="14.5" width="451" height="331" rx="3" fill="none" stroke="#e6dccb"/>
${stampText}</svg>`;
}

// ---------- 場面 ----------

// 1971 誕生：和室の布団で眠る赤ちゃんと、祖母の赤飯
const birth = `
<rect width="480" height="230" fill="#efe3c6"/>
${Array.from({ length: 9 }, (_, i) => `<line x1="${20 + i * 56}" y1="0" x2="${20 + i * 56}" y2="230" stroke="#c9b48c" stroke-width="3"/>`).join("")}
${Array.from({ length: 4 }, (_, i) => `<line x1="0" y1="${40 + i * 56}" x2="480" y2="${40 + i * 56}" stroke="#c9b48c" stroke-width="2"/>`).join("")}
<rect y="230" width="480" height="130" fill="#c7b46f"/>
${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="${236 + i * 11}" x2="480" y2="${236 + i * 11}" stroke="#b39f5c" stroke-width="1.5"/>`).join("")}
<rect x="40" y="226" width="400" height="8" fill="#5a3b22"/>
<ellipse cx="200" cy="270" rx="150" ry="62" fill="#f4c7c9"/>
<ellipse cx="200" cy="270" rx="150" ry="62" fill="none" stroke="#e7a9ae" stroke-width="4"/>
<path d="M90 262 q110 -40 220 0" fill="none" stroke="#e7a9ae" stroke-width="3"/>
<ellipse cx="170" cy="240" rx="58" ry="38" fill="#fff6ef"/>
<circle cx="170" cy="236" r="32" fill="#f7d9c0"/>
<path d="M155 233 q6 5 12 0 M175 233 q6 5 12 0" fill="none" stroke="#6b4a3a" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="152" cy="246" r="6" fill="#f2a9a0" opacity="0.8"/><circle cx="190" cy="246" r="6" fill="#f2a9a0" opacity="0.8"/>
<path d="M165 252 q5 4 10 0" fill="none" stroke="#c97b6b" stroke-width="2" stroke-linecap="round"/>
<path d="M150 208 q20 -16 40 0" fill="none" stroke="#7a5a44" stroke-width="2"/>
<rect x="352" y="252" width="100" height="16" rx="3" fill="#7a2a1e"/>
<rect x="362" y="268" width="80" height="12" fill="#5c1f16"/>
<path d="M366 252 q36 -56 72 0 z" fill="#2b1c16"/>
<path d="M372 248 q30 -40 60 0 z" fill="#c4554a"/>
${[[388, 236], [400, 230], [412, 238], [396, 242], [420, 244], [380, 244], [406, 246]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#5e1a14"/>`).join("")}
<rect x="352" y="244" width="100" height="5" fill="#e8d7a8"/>
`;

// 1978 小学校入学：桜と校舎、大きなランドセル
const school = `
<rect width="480" height="360" fill="#bfe0f2"/>
<rect x="120" y="70" width="380" height="150" fill="#f3efe4"/>
<rect x="120" y="64" width="380" height="12" fill="#cfc6b3"/>
${Array.from({ length: 2 }, (_, r) => Array.from({ length: 7 }, (_, i) => `<rect x="${140 + i * 50}" y="${92 + r * 58}" width="34" height="38" fill="#9fc3d6" stroke="#8a8170" stroke-width="2"/>`).join("")).join("")}
<circle cx="310" cy="48" r="0"/>
<rect x="290" y="30" width="44" height="40" fill="#f3efe4"/><circle cx="312" cy="50" r="14" fill="#fff" stroke="#6b5f4a" stroke-width="2"/><path d="M312 50 v-9 M312 50 h7" stroke="#333" stroke-width="2"/>
<rect y="220" width="480" height="140" fill="#d9c49a"/>
<rect x="56" y="120" width="22" height="130" fill="#6b4630"/>
<path d="M66 170 l-30 -40 M70 150 l34 -36" stroke="#6b4630" stroke-width="9" stroke-linecap="round"/>
${[[20, 90, 46], [70, 70, 52], [120, 96, 44], [40, 130, 40], [100, 135, 38], [-4, 120, 34], [150, 70, 30]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f6c2cf"/><circle cx="${x + 8}" cy="${y - 6}" r="${r * 0.6}" fill="#fadbe3"/>`).join("")}
${[[200, 250], [260, 300], [320, 270], [150, 320], [380, 310], [420, 260], [230, 200], [300, 230]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="#f3a8bb" transform="rotate(30 ${x} ${y})"/>`).join("")}
<rect x="250" y="292" width="16" height="44" rx="5" fill="#f4d7bd"/><rect x="274" y="292" width="16" height="44" rx="5" fill="#f4d7bd"/>
<rect x="248" y="330" width="20" height="12" rx="4" fill="#3b3b4f"/><rect x="272" y="330" width="20" height="12" rx="4" fill="#3b3b4f"/>
<rect x="238" y="272" width="64" height="30" rx="6" fill="#26355e"/>
<rect x="236" y="196" width="68" height="84" rx="8" fill="#e9e4da"/>
<rect x="228" y="200" width="84" height="88" rx="16" fill="#c62a21"/>
<rect x="228" y="232" width="84" height="6" fill="#9b1e18"/>
<rect x="264" y="246" width="12" height="16" rx="3" fill="#e8c35a"/>
<ellipse cx="270" cy="182" rx="30" ry="24" fill="#3a2a22"/>
<ellipse cx="270" cy="170" rx="38" ry="12" fill="#f2c94c"/><ellipse cx="270" cy="164" rx="24" ry="16" fill="#f2c94c"/>
`;

// 1984 中学（野球部）：グラウンドのホームベース、バット、帽子
const baseball = `
<rect width="480" height="360" fill="#a9d5ef"/>
<rect y="70" width="480" height="70" fill="#5f9a4f"/>
<rect y="40" width="480" height="40" fill="#7fb36b"/>
${Array.from({ length: 25 }, (_, i) => `<line x1="${i * 20}" y1="20" x2="${i * 20}" y2="150" stroke="#7d7d7d" stroke-width="2"/>`).join("")}
${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${20 + i * 22}" x2="480" y2="${20 + i * 22}" stroke="#7d7d7d" stroke-width="2"/>`).join("")}
<rect y="140" width="480" height="220" fill="#c99b62"/>
${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 97) % 480}" cy="${160 + ((i * 53) % 190)}" r="2" fill="#b0834f"/>`).join("")}
<path d="M200 300 h80 v-24 l-40 -26 l-40 26 z" fill="#fbfbf6"/>
<path d="M90 160 l150 100 l150 -100" fill="none" stroke="#fff" stroke-width="5" opacity="0.8"/>
<g transform="rotate(-24 360 240)"><rect x="300" y="232" width="150" height="14" rx="7" fill="#d9b072"/><rect x="290" y="234" width="24" height="10" rx="4" fill="#7a5532"/></g>
<circle cx="118" cy="292" r="16" fill="#fbfbf6"/><path d="M108 282 q6 10 0 20 M128 282 q-6 10 0 20" fill="none" stroke="#c0392b" stroke-width="2"/>
<path d="M300 318 q40 -50 90 0 z" fill="#1f2d5c"/><path d="M385 318 q30 0 46 12 l-50 2 z" fill="#1f2d5c"/>
<text x="345" y="306" font-family="sans-serif" font-size="20" font-weight="700" fill="#fff">K</text>
`;

// 1987 高校（汽車通学）：朝の田舎駅とクリーム色に赤帯の気動車
const train = `
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c9a8"/><stop offset="1" stop-color="#cfe2ef"/></linearGradient></defs>
<rect width="480" height="360" fill="url(#sky)"/>
<path d="M0 170 l70 -60 l60 40 l80 -80 l90 90 l70 -50 l110 70 v40 h-480z" fill="#8aa4b3"/>
<path d="M0 190 l90 -40 l80 30 l110 -50 l90 50 l110 -20 v40 h-480z" fill="#6f8a77"/>
<circle cx="390" cy="80" r="22" fill="#fff3d6"/>
<rect y="200" width="480" height="160" fill="#9a9a93"/>
<rect x="160" y="196" width="320" height="6" fill="#6d6d66"/>
<rect x="0" y="250" width="480" height="110" fill="#b8b4a8"/>
<rect x="0" y="250" width="480" height="8" fill="#e8dc8a"/>
<rect x="30" y="98" width="160" height="104" rx="10" fill="#f1e2bd"/>
<rect x="30" y="160" width="160" height="14" fill="#c0392b"/>
<rect x="46" y="112" width="56" height="40" rx="5" fill="#3c4a56"/><rect x="118" y="112" width="56" height="40" rx="5" fill="#3c4a56"/>
<circle cx="56" cy="186" r="7" fill="#fff6c2"/><circle cx="164" cy="186" r="7" fill="#fff6c2"/>
<rect x="88" y="182" width="44" height="10" rx="3" fill="#6d6d66"/>
<rect x="190" y="104" width="190" height="96" fill="#efdeb6"/><rect x="190" y="160" width="190" height="14" fill="#c0392b"/>
${Array.from({ length: 4 }, (_, i) => `<rect x="${204 + i * 44}" y="116" width="32" height="32" rx="3" fill="#3c4a56"/>`).join("")}
<rect x="392" y="214" width="6" height="40" fill="#555"/><rect x="452" y="214" width="6" height="40" fill="#555"/>
<rect x="382" y="196" width="86" height="28" rx="3" fill="#fbfbf6" stroke="#555" stroke-width="2"/>
<rect x="394" y="206" width="62" height="6" rx="3" fill="#2c3e50"/>
<rect x="270" y="268" width="22" height="58" rx="8" fill="#1f2d5c"/><circle cx="281" cy="258" r="12" fill="#3a2a22"/>
<rect x="266" y="284" width="30" height="18" rx="4" fill="#5c4033"/>
<rect x="272" y="324" width="8" height="18" fill="#222"/><rect x="284" y="324" width="8" height="18" fill="#222"/>
`;

// 1990 大学・一人暮らし：6畳一間、ちゃぶ台にカレー
const apartment = `
<rect width="480" height="360" fill="#ece0c8"/>
<rect x="250" y="40" width="190" height="130" fill="#26324a"/>
<circle cx="400" cy="72" r="14" fill="#f7efc8"/>
${[[290, 70], [330, 110], [360, 60], [280, 130], [420, 130]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#fff"/>`).join("")}
<rect x="250" y="40" width="190" height="130" fill="none" stroke="#8b6b4a" stroke-width="8"/>
<line x1="345" y1="40" x2="345" y2="170" stroke="#8b6b4a" stroke-width="5"/>
<path d="M232 34 q20 70 0 146 h-14 v-146z" fill="#d98c5f"/><path d="M458 34 q-20 70 0 146 h14 v-146z" fill="#d98c5f"/>
<rect x="40" y="70" width="90" height="110" fill="#f6f1e6" stroke="#c9b99a" stroke-width="3"/>
<circle cx="85" cy="112" r="24" fill="#e9b84a"/><rect x="58" y="146" width="54" height="8" fill="#c0392b"/>
<rect y="210" width="480" height="150" fill="#cbb879"/>
${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${222 + i * 24}" x2="480" y2="${222 + i * 24}" stroke="#b8a466" stroke-width="2"/>`).join("")}
<rect x="20" y="150" width="96" height="76" rx="6" fill="#4b4b4b"/><rect x="30" y="160" width="76" height="52" rx="8" fill="#7fa3b5"/>
<rect x="10" y="224" width="116" height="20" fill="#7a5a3a"/>
<ellipse cx="290" cy="280" rx="150" ry="44" fill="#8b5a33"/>
<ellipse cx="290" cy="272" rx="150" ry="44" fill="#a86c3c"/>
<rect x="150" y="280" width="16" height="50" fill="#7a4a26"/><rect x="414" y="280" width="16" height="50" fill="#7a4a26"/>
<ellipse cx="280" cy="268" rx="70" ry="22" fill="#fbfbf6"/>
<ellipse cx="262" cy="266" rx="36" ry="13" fill="#fffef6"/>
<path d="M270 262 q30 -12 56 0 q-6 14 -40 14 q-14 0 -16 -14z" fill="#9b5a1c"/>
${[[290, 264], [304, 268], [314, 262]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#e08b2c"/>`).join("")}
<path d="M318 246 l36 -20" stroke="#c9c9c9" stroke-width="5" stroke-linecap="round"/>
<rect x="378" y="236" width="24" height="34" rx="4" fill="#d8eef7" opacity="0.9"/>
`;

// 1994 就職：駅前のビル街と横断歩道、スーツの後ろ姿
const work = `
<rect width="480" height="360" fill="#cfe4f2"/>
<rect x="20" y="60" width="110" height="200" fill="#9aa9b8"/><rect x="140" y="20" width="120" height="240" fill="#b7c3cf"/>
<rect x="270" y="80" width="90" height="180" fill="#8c9bab"/><rect x="370" y="40" width="110" height="220" fill="#a8b6c4"/>
${[[20, 60, 110, 200], [140, 20, 120, 240], [270, 80, 90, 180], [370, 40, 110, 220]].map(([x, y, w, h]) =>
  Array.from({ length: Math.floor(h / 28) }, (_, r) => Array.from({ length: Math.floor(w / 26) }, (_, c) => `<rect x="${x + 8 + c * 26}" y="${y + 10 + r * 28}" width="16" height="16" fill="#e4eef6" opacity="0.85"/>`).join("")).join("")).join("")}
<rect y="250" width="480" height="110" fill="#55595e"/>
${Array.from({ length: 9 }, (_, i) => `<rect x="${i * 56 + 4}" y="282" width="34" height="64" fill="#efefe9" transform="skewX(-16) translate(60 0)"/>`).join("")}
<rect x="226" y="236" width="40" height="72" rx="10" fill="#2a3346"/>
<rect x="226" y="300" width="17" height="46" fill="#232a3a"/><rect x="249" y="300" width="17" height="46" fill="#232a3a"/>
<rect x="222" y="342" width="22" height="8" rx="3" fill="#111"/><rect x="248" y="342" width="22" height="8" rx="3" fill="#111"/>
<circle cx="246" cy="222" r="16" fill="#2b2420"/>
<rect x="264" y="282" width="34" height="26" rx="3" fill="#4a3424"/><rect x="274" y="276" width="14" height="8" rx="3" fill="none" stroke="#4a3424" stroke-width="3"/>
${[[60, 330], [120, 300], [400, 320], [430, 290]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="#f3b8c6"/>`).join("")}
`;

// 1998 結婚：海と松の島々を望むテラスの二人
const wedding = `
<rect width="480" height="360" fill="#bfe3f5"/>
<ellipse cx="120" cy="60" rx="60" ry="16" fill="#fff" opacity="0.85"/><ellipse cx="360" cy="44" rx="48" ry="12" fill="#fff" opacity="0.8"/>
<rect y="150" width="480" height="210" fill="#3d8fbf"/>
<rect y="150" width="480" height="40" fill="#5aa6cf"/>
${[[90, 160, 48], [210, 150, 30], [330, 162, 58], [430, 152, 26]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y + 6}" rx="${r}" ry="${r * 0.34}" fill="#d8cfb8"/><path d="M${x - r * 0.8} ${y + 4} q${r * 0.8} ${-r * 1.1} ${r * 1.6} 0z" fill="#3f6b3b"/>${[-0.4, 0, 0.4].map((d) => `<path d="M${x + d * r} ${y - r * 0.5} l-10 14 h20z M${x + d * r} ${y - r * 0.62} l-8 12 h16z" fill="#2f5530"/>`).join("")}`).join("")}
${Array.from({ length: 8 }, (_, i) => `<path d="M${i * 64} ${210 + (i % 3) * 18} q16 -6 32 0" fill="none" stroke="#a8d4ea" stroke-width="2"/>`).join("")}
<rect y="262" width="480" height="98" fill="#e9dfcf"/>
<rect y="248" width="480" height="10" fill="#fbfbf6"/>
${Array.from({ length: 13 }, (_, i) => `<rect x="${i * 40}" y="256" width="8" height="36" fill="#fbfbf6"/>`).join("")}
<path d="M196 350 l30 -96 h22 l30 96z" fill="#fffefa"/>
<path d="M210 260 q26 -40 56 0 l14 90 h-84z" fill="#fffefa" opacity="0.7"/>
<circle cx="237" cy="232" r="15" fill="#3a2a22"/><path d="M222 226 q15 -24 30 0 l10 40 q-25 10 -50 0z" fill="#fff" opacity="0.75"/>
<rect x="282" y="242" width="40" height="108" rx="10" fill="#1d1f26"/>
<circle cx="302" cy="226" r="15" fill="#2b2420"/>
<path d="M266 286 q14 10 26 0" fill="none" stroke="#f2d0d6" stroke-width="10" stroke-linecap="round"/>
<circle cx="262" cy="290" r="9" fill="#f6a5b8"/><circle cx="252" cy="294" r="7" fill="#fff"/>
`;

// 2000 長女誕生：夜中のミルク。ベビーベッドと月
const babyGirl = `
<rect width="480" height="360" fill="#3a3f5c"/>
<rect x="300" y="36" width="150" height="120" fill="#1f2440"/><circle cx="400" cy="80" r="22" fill="#f6eec2"/>
${[[330, 60], [350, 120], [430, 130], [320, 100]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#fff"/>`).join("")}
<rect x="300" y="36" width="150" height="120" fill="none" stroke="#6b5a48" stroke-width="7"/>
<circle cx="90" cy="120" r="120" fill="#f9d98a" opacity="0.22"/>
<path d="M60 70 h60 l-12 40 h-36z" fill="#f4dfa3"/><rect x="86" y="110" width="8" height="70" fill="#8a7458"/>
<rect y="250" width="480" height="110" fill="#6b5446"/>
<rect x="110" y="170" width="260" height="110" rx="10" fill="#f4e9da"/>
${Array.from({ length: 12 }, (_, i) => `<rect x="${124 + i * 20}" y="178" width="8" height="94" rx="3" fill="#e2d2bb"/>`).join("")}
<rect x="104" y="160" width="272" height="14" rx="7" fill="#d9c4a5"/>
<ellipse cx="240" cy="246" rx="110" ry="26" fill="#f7c5cf"/>
<circle cx="200" cy="232" r="22" fill="#f8dcc6"/>
<path d="M191 230 q4 4 8 0 M205 230 q4 4 8 0" fill="none" stroke="#6b4a3a" stroke-width="2" stroke-linecap="round"/>
<circle cx="190" cy="239" r="4" fill="#f2a9a0"/><circle cx="212" cy="239" r="4" fill="#f2a9a0"/>
<path d="M240 70 v40" stroke="#bbb" stroke-width="2"/><path d="M200 110 h80" stroke="#bbb" stroke-width="3"/>
${[[200, 128, "#f6c3cf"], [240, 134, "#f6e08a"], [280, 128, "#a9d8f0"]].map(([x, y, c]) => `<line x1="${x}" y1="110" x2="${x}" y2="${y - 10}" stroke="#bbb"/><path d="M${x} ${y - 12} l4 8 h9 l-7 6 l3 9 l-9 -5 l-9 5 l3 -9 l-7 -6 h9z" fill="${c}"/>`).join("")}
<rect x="398" y="226" width="26" height="54" rx="8" fill="#fbfbf6" opacity="0.95"/><rect x="398" y="244" width="26" height="36" rx="6" fill="#f6f1e1"/>
<path d="M404 226 q7 -18 14 0z" fill="#f2c27b"/>
`;

// 2003 長男誕生：お姉ちゃんが弟をのぞきこむ
const babyBoy = `
<rect width="480" height="360" fill="#f3ead8"/>
<rect x="320" y="40" width="130" height="110" fill="#cfe9f5"/><rect x="320" y="40" width="130" height="110" fill="none" stroke="#c9b28a" stroke-width="7"/>
<circle cx="350" cy="120" r="14" fill="#f7c6d0"/><circle cx="372" cy="108" r="12" fill="#f9d5de"/><circle cx="420" cy="118" r="13" fill="#f7c6d0"/>
<rect y="260" width="480" height="100" fill="#d6c09b"/>
<rect x="60" y="180" width="270" height="100" rx="10" fill="#fbf8f1"/>
${Array.from({ length: 12 }, (_, i) => `<rect x="${74 + i * 21}" y="188" width="8" height="84" rx="3" fill="#ece3d2"/>`).join("")}
<rect x="54" y="170" width="282" height="14" rx="7" fill="#e6d6ba"/>
<ellipse cx="190" cy="248" rx="104" ry="24" fill="#a9d3ee"/>
<circle cx="160" cy="236" r="21" fill="#f8dcc6"/>
<path d="M152 234 q4 4 8 0 M166 234 q4 4 8 0" fill="none" stroke="#6b4a3a" stroke-width="2" stroke-linecap="round"/>
<circle cx="150" cy="242" r="4" fill="#f2a9a0"/><circle cx="171" cy="242" r="4" fill="#f2a9a0"/>
<rect x="352" y="214" width="58" height="80" rx="18" fill="#f28fa5"/>
<rect x="362" y="290" width="14" height="40" rx="5" fill="#f8dcc6"/><rect x="386" y="290" width="14" height="40" rx="5" fill="#f8dcc6"/>
<path d="M352 230 q-30 -10 -30 -46" stroke="#f28fa5" stroke-width="14" fill="none" stroke-linecap="round"/>
<circle cx="322" cy="182" r="9" fill="#f8dcc6"/>
<circle cx="384" cy="186" r="28" fill="#f8dcc6"/>
<path d="M356 180 q28 -40 56 0 q-6 -14 -28 -16 q-22 2 -28 16z" fill="#4a3226"/>
<circle cx="354" cy="182" r="9" fill="#4a3226"/><circle cx="414" cy="182" r="9" fill="#4a3226"/>
<circle cx="350" cy="188" r="4" fill="#f6c94c"/><circle cx="418" cy="188" r="4" fill="#f6c94c"/>
<circle cx="372" cy="190" r="3" fill="#3a2a22"/><circle cx="386" cy="190" r="3" fill="#3a2a22"/>
<path d="M372 202 q7 6 14 0" fill="none" stroke="#c9604f" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="364" cy="198" r="4" fill="#f2a9a0"/><circle cx="394" cy="198" r="4" fill="#f2a9a0"/>
`;

// 2008 盛岡へ：雪の町と雪だるま、白い山
const morioka = `
<rect width="480" height="360" fill="#c9dcea"/>
<path d="M60 170 l130 -110 l120 110z" fill="#7d93a8"/><path d="M150 94 l40 -34 l42 38 l-18 -6 l-12 10 l-14 -12 l-16 10z" fill="#fbfdff"/>
<path d="M240 180 l110 -80 l140 90z" fill="#90a5b8"/>
<rect y="170" width="480" height="190" fill="#f5f8fb"/>
<rect x="40" y="150" width="120" height="90" fill="#b5866a"/><path d="M28 156 l72 -52 l72 52z" fill="#5b6f84"/><path d="M28 156 l72 -52 l72 52 l-8 6 l-64 -44 l-64 44z" fill="#fbfdff"/>
<rect x="64" y="180" width="30" height="28" fill="#f6dfa0"/><rect x="110" y="196" width="28" height="44" fill="#6f4c3a"/>
${Array.from({ length: 6 }, (_, i) => `<path d="M${40 + i * 22} 156 l3 ${12 + (i % 3) * 6} l3 ${-12 - (i % 3) * 6}z" fill="#e3f1fb"/>`).join("")}
<rect x="300" y="140" width="140" height="100" fill="#c9b79c"/><path d="M288 146 l82 -50 l82 50z" fill="#fbfdff"/>
<rect x="320" y="170" width="34" height="30" fill="#f6dfa0"/><rect x="380" y="170" width="34" height="30" fill="#f6dfa0"/>
<circle cx="230" cy="290" r="44" fill="#fff" stroke="#dfe7ee" stroke-width="3"/>
<circle cx="230" cy="222" r="32" fill="#fff" stroke="#dfe7ee" stroke-width="3"/>
<circle cx="219" cy="216" r="4" fill="#333"/><circle cx="241" cy="216" r="4" fill="#333"/>
<path d="M230 224 l14 5 l-14 3z" fill="#e67e22"/>
<path d="M200 198 q30 -30 60 0z" fill="#c0392b"/><rect x="198" y="240" width="64" height="10" rx="5" fill="#2e86c1"/>
<path d="M190 280 l-40 -24 M270 280 l40 -26" stroke="#7a5532" stroke-width="5" stroke-linecap="round"/>
${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 89) % 480}" cy="${(i * 47) % 360}" r="${2 + (i % 3)}" fill="#fff" opacity="0.9"/>`).join("")}
`;

// 2015 家を建てる：小さな家と柿の木
const house = `
<rect width="480" height="360" fill="#a8d8f2"/>
<ellipse cx="380" cy="60" rx="56" ry="16" fill="#fff" opacity="0.9"/>
<rect y="250" width="480" height="110" fill="#8cc06a"/>
<rect x="150" y="130" width="200" height="130" fill="#eef0ee"/>
<path d="M130 136 l120 -76 l120 76z" fill="#3e4a5a"/>
<rect x="170" y="160" width="56" height="44" fill="#bfe1f2" stroke="#7f8c8d" stroke-width="3"/>
<rect x="270" y="186" width="44" height="74" fill="#a0724e"/><circle cx="304" cy="226" r="3" fill="#f1c40f"/>
<rect x="290" y="90" width="22" height="34" fill="#5d6d7e"/>
<rect x="64" y="170" width="16" height="96" fill="#6b4630"/>
<circle cx="72" cy="150" r="54" fill="#4f8a3c"/><circle cx="50" cy="130" r="30" fill="#5f9d48"/><circle cx="96" cy="128" r="28" fill="#5f9d48"/>
${[[48, 150], [80, 120], [100, 160], [60, 178], [36, 118], [92, 140], [70, 140]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#f08a24"/>`).join("")}
<rect x="380" y="250" width="70" height="18" fill="#c9a97a"/>
<rect x="404" y="214" width="6" height="40" fill="#6b4630"/><circle cx="407" cy="206" r="12" fill="#6fb24f"/>
<path d="M430 268 l-12 -40" stroke="#888" stroke-width="5" stroke-linecap="round"/><path d="M412 222 l12 -4 l2 14z" fill="#9aa"/>
<rect x="0" y="300" width="480" height="60" fill="#7bb25b"/>
${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 30 + 6} 312 l4 -10 l4 10" stroke="#5f9445" stroke-width="2" fill="none"/>`).join("")}
`;

// 2021 50歳：テーブルの上のスマホと昔のプリント写真
const fifty = `
<rect width="480" height="360" fill="#b98a5e"/>
${Array.from({ length: 8 }, (_, i) => `<path d="M0 ${i * 48 + 12} q240 ${i % 2 ? 10 : -10} 480 0" stroke="#a87a4f" stroke-width="3" fill="none"/>`).join("")}
<g transform="rotate(-12 110 120)"><rect x="40" y="60" width="140" height="110" fill="#fbf8f1"/><rect x="50" y="70" width="120" height="78" fill="#c9a77c"/><circle cx="110" cy="104" r="16" fill="#e8c9a0"/><text x="160" y="164" font-family="monospace" font-size="10" fill="#ff7b22" text-anchor="end">'78 4 6</text></g>
<g transform="rotate(8 120 270)"><rect x="50" y="210" width="140" height="110" fill="#fbf8f1"/><rect x="60" y="220" width="120" height="78" fill="#8fb3c9"/><path d="M60 280 l30 -26 l26 20 l30 -30 l34 36z" fill="#6f8a77"/></g>
<g transform="rotate(-4 400 280)"><rect x="330" y="230" width="130" height="100" fill="#fbf8f1"/><rect x="340" y="240" width="110" height="70" fill="#d8b0a0"/><circle cx="395" cy="270" r="14" fill="#f2d7c4"/></g>
<rect x="196" y="44" width="128" height="250" rx="18" fill="#1c1c1e"/>
<rect x="204" y="62" width="112" height="214" rx="6" fill="#f7f7f7"/>
${Array.from({ length: 4 }, (_, r) => Array.from({ length: 3 }, (_, c) => `<rect x="${208 + c * 36}" y="${84 + r * 44}" width="32" height="40" fill="${["#e8c9a0", "#9fc3d6", "#f2b8b5", "#a7c48f", "#d6b28a", "#c5d8e6"][(r * 3 + c) % 6]}"/>`).join("")).join("")}
<rect x="204" y="62" width="112" height="18" fill="#fff"/><rect x="214" y="68" width="40" height="6" rx="3" fill="#bbb"/>
<rect x="240" y="282" width="40" height="5" rx="2.5" fill="#555"/>
<ellipse cx="400" cy="110" rx="44" ry="40" fill="#f4f1ea"/><ellipse cx="400" cy="104" rx="32" ry="26" fill="#8a5a2b"/>
<path d="M440 104 q24 0 20 22 q-6 14 -24 6" fill="none" stroke="#f4f1ea" stroke-width="8"/>
`;

export const SAMPLE_PHOTOS = {
  birth: photo(birth, { tone: "70s" }),
  school: photo(school, { tone: "70s", stamp: "'78 4 6" }),
  baseball: photo(baseball, { tone: "80s", stamp: "'84 7 22" }),
  train: photo(train, { tone: "80s", stamp: "'87 4 10" }),
  apartment: photo(apartment, { tone: "90s", stamp: "'90 4 15" }),
  work: photo(work, { tone: "90s", stamp: "'94 4 1" }),
  wedding: photo(wedding, { tone: "90s", stamp: "'98 10 18" }),
  babyGirl: photo(babyGirl, { tone: "90s", stamp: "'00 7 8" }),
  babyBoy: photo(babyBoy, { stamp: "'03 3 21" }),
  morioka: photo(morioka),
  house: photo(house),
  fifty: photo(fifty),
};

export const PHOTO_SIZE = { width: W, height: H };

export function photoDataURL(key) {
  const svg = SAMPLE_PHOTOS[key];
  if (!svg) return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
