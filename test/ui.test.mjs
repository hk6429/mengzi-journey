import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s = {}; vm.runInNewContext(fs.readFileSync('src/data.js', 'utf8') + ';globalThis.D=DATA;', s);
const P = s.D.planets;
const len = t => [...t].length;
const all = P.flatMap(p => [p.name, p.sub, p.next, p.think, ...p.story, ...p.elements.flatMap(e => [e.name, e.desc]), ...Object.entries(p.gloss).flat()]).join('')
  + s.D.adults.map(a => a.who + a.cares + a.prince).join('');
const ui = ['parts/ui.html', 'parts/ui.js', 'parts/ui.css'].map(f => fs.readFileSync(f, 'utf8')).join('');
const js = fs.readFileSync('parts/ui.js', 'utf8'), html = fs.readFileSync('parts/ui.html', 'utf8');

test('孟子第一人稱、舜與傅說用傳說口吻', () => {
  P.forEach(p => assert.ok(p.story.join('').includes('我'), p.id));
  assert.ok(P[0].story.join('').includes('我是孟子'));
  const f = P[0].story.join(''); assert.ok(f.match(/傳說/g).length >= 2, '舜、傅說都要「傳說」');
});
test('全文不含簡體常見字、標點為全形', () => {
  const bad = all.match(/[们这说时门发过来对么为会还没让见给开关样头]/g);
  assert.equal(bad, null, '簡體字：' + (bad || []).join(''));
  assert.equal(/[,;:!?]/.test(all), false, '有半形標點');
});
test('shots 與 story 同長度、每格是元素 id 或 null', () => P.forEach(p => {
  assert.equal(p.shots.length, p.story.length, p.id + ' shots 長度');
  const ids = p.elements.map(e => e.id);
  p.shots.forEach((x, i) => assert.ok(x === null || ids.includes(x), `${p.id} 第 ${i + 1} 段 shots 不合法：${x}`));
}));
test('每站有思考題 think（問句）', () => P.forEach(p => assert.ok(p.think && len(p.think) >= 15 && p.think.includes('？'), p.id)));
test('gloss：每站至少 2 個原文字詞，每個詞都出現在原文、故事或元素介紹裡', () => P.forEach(p => {
  const txt = p.yuan + p.story.join('') + p.elements.map(e => e.desc).join('');
  const ks = Object.keys(p.gloss);
  assert.ok(ks.filter(k => p.yuan.includes(k)).length >= 2, p.id);
  ks.forEach(k => { assert.ok(txt.includes(k), `${p.id} 生詞「${k}」沒出現`); assert.ok(len(p.gloss[k]) >= 2, k); });
}));
test('重要字詞都有註解', () => {
  const g = Object.assign({}, ...P.map(p => p.gloss));
  '畎畝 傅說 舉 版築 膠鬲 士 大任 是人 拂 曾 衡 作 徵 喻 法家 拂士 憂患'.split(' ').forEach(k => assert.ok(g[k], k));
});
test('介面沒有前作殘留、沒有英文版', () => {
  assert.equal(/\u611b\u84ee|\u5468\u6566\u9824|濂溪|茂叔|\u9752\u86d9|騎蛙|\u8377\u8449|蓮池|君子|al[s]-v1|ailianshuo|\u516b\u7ad9|八片/.test(ui), false, '\u611b\u84ee說殘留');
  assert.equal(/劉禹錫|仙鶴|乘鶴|lushiming|仙山|德馨/.test(ui), false, '陋室銘殘留');
  assert.equal(/小王子|星球|綠野仙蹤|桃[花]|漁[人]/.test(ui), false, '更早前作殘留');
  assert.equal(/ui-lang|ui-level|is-en|LP_EN|voice-en|data-en/.test(ui), false, '英文版殘留');
});
test('本作字樣：標題、導讀卡、按鈕、存檔、頁尾', () => {
  assert.ok(ui.includes("'mengzi-v2'"), 'localStorage mengzi-v2');
  assert.ok(ui.includes("'乘舟前往'") && html.includes('乘舟出發'), '按鈕「乘舟前往〇〇」');
  assert.ok(html.includes('孟子・憂患之旅') && html.includes('《孟子・告子下》') && html.includes('論說文') && html.includes('斯人') && html.includes('是人'), '標題與導讀卡');
  assert.ok(ui.includes('六站全部過關') && html.includes('原文：《孟子・告子下》（戰國・孟子）'), '六站與頁尾出處');
  assert.ok(html.includes('<caption>六個人的起點</caption>') && js.includes('data-h="後來被誰任用"'), '統整表');
  assert.ok(ui.includes('ctx.goHome'), '結尾要呼叫 ctx.goHome');
});
test('證書兩版：文言「結業狀」、白話「結業證書」，六站三個一排、朱印「憂患」、依版本＋名字快取', () => {
  assert.ok(js.includes('結業狀') && js.includes('結業證書') && js.includes("'mengzi-certificate.png'") && js.includes("'mengzi-jieyezhuang.png'"));
  assert.ok(html.includes('ui-cert-ver-gu') && html.includes('ui-cert-ver-bai'), '表單版本選擇');
  assert.ok(js.includes("ver + '|' + st.name"), 'PNG 依版本＋名字快取');
  assert.ok(js.includes("'hero'") && js.includes('i % 3'), '主角照 cert/hero.jpg、成績三個一排');
  assert.ok(js.includes("g.fillText('憂', 0, -6); g.fillText('患', 0, 46);") && html.includes('>憂</text>'), '朱印「憂患」');
});
test('每站 5 題測驗：四選項不重複、正解索引合法、有解析、全形標點', () => P.forEach(p => {
  const qs = s.D.quiz[p.id]; assert.equal(qs && qs.length, 5, p.id);
  qs.forEach((q, i) => {
    const t = `${p.id} 第 ${i + 1} 題`;
    assert.ok(q.q.endsWith('？'), t + ' 題目要是問句');
    assert.equal(q.c.length, 4, t); assert.equal(new Set(q.c).size, 4, t + ' 選項重複');
    assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, t);
    assert.ok(q.why && len(q.why) >= 6, t + ' 解析');
    assert.equal(/[,;:!?]/.test(q.q + q.c.join('') + q.why), false, t + ' 半形標點');
  });
}));
test('頁面標題、description、載入字樣是本作', () => {
  const sh = fs.readFileSync('src/shell.html', 'utf8'), boot = fs.readFileSync('src/boot.js', 'utf8');
  const head = sh.match(/<title>[\s\S]*?name="description"[^>]*>/)[0];
  assert.ok(head.includes('孟子') && head.includes('六座') && head.includes('生於憂患'), head);
  assert.equal(/\u611b\u84ee|\u5468\u6566\u9824|\u8377\u8449|\u9752\u86d9|劉禹錫|仙鶴/.test(head + boot), false, '前作殘留');
  assert.ok(boot.includes('孟子登舟出發'));
});
test('朗讀清單：36 段都登記、檔名對得上站與段', () => {
  const m = JSON.parse(fs.readFileSync('public/voice/manifest.json', 'utf8')).files;
  const want = P.flatMap(p => [p.id + '-y', ...p.story.map((_, i) => `${p.id}-${i + 1}`)]);
  assert.equal(Object.keys(m).sort().join(), [...want].sort().join());
});
test('無障礙（第三輪）：段落不整段 aria-live、不自動開證書、不聚焦姓名框', () => {
  assert.equal(/id="ui-para"[^>]*aria-live/.test(html), false);
  assert.ok(html.includes('id="ui-sr" role="status"'));
  assert.equal(js.includes("$('ui-quiz-cert').click()"), false, '不自動點證書');
  assert.equal(js.includes("$('ui-cert-name').focus"), false, '不聚焦姓名框');
});
