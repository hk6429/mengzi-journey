import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s = {}; vm.runInNewContext(fs.readFileSync('src/data.js', 'utf8') + ';globalThis.D=DATA;', s);
const P = s.D.planets;
const len = t => [...t].length;
const SEGS = { baihua: 5, ju: 6, mudan: 6, yuni: 6, jing: 5, xiang: 6, pin: 6, lianxi: 6 };
// next 要提到下一站的關鍵字
const KEY = { ju: '菊', mudan: '牡丹', yuni: '蓮塘', jing: '藕', xiang: '香', pin: '三瓶花', lianxi: '書堂' };

test('八站順序', () => assert.equal(P.map(p => p.id).join(), Object.keys(SEGS).join()));
test('story 段數照契約、每段 60–130 字、周敦頤第一人稱', () => P.forEach(p => {
  assert.equal(p.story.length, SEGS[p.id], p.id + ' 段數 ' + p.story.length);
  p.story.forEach((t, i) => assert.ok(len(t) >= 60 && len(t) <= 130, `${p.id}-${i + 1} 字數 ${len(t)}`));
  assert.ok(p.story.join('').includes('我'), p.id);
}));
test('沒有待寫殘留', () => assert.equal(JSON.stringify(s.D).includes('待寫'), false));
test('next 都有且提到下一站；最後一站的 next 是留白結尾句', () => P.forEach((p, i) => {
  if (i === P.length - 1) return assert.ok(p.next.includes('愛蓮'), 'lianxi next');
  assert.ok(p.next.includes(KEY[P[i + 1].id]), `${p.id} next 沒提到 ${KEY[P[i + 1].id]}`);
}));
test('每個 element 有 desc', () => P.forEach(p => p.elements.forEach(e => assert.ok(e.desc && len(e.desc) >= 10, p.id + '/' + e.id))));
const all = P.flatMap(p => [p.name, p.sub, p.next, p.think, ...p.story, ...p.elements.flatMap(e => [e.name, e.desc]), ...Object.entries(p.gloss).flat()]).join('')
  + s.D.adults.map(a => a.who + a.cares + a.prince).join('');
test('全文不含簡體常見字、標點為全形', () => {
  const bad = all.match(/[们这说时门发过来对么为会还没让见给开关样头]/g);
  assert.equal(bad, null, '簡體字：' + (bad || []).join(''));
  assert.equal(/[,;:!?]/.test(all), false, '有半形標點');
});
test('依原著情節：自我介紹、陶淵明愛菊、長安牡丹、淤泥不染、中通外直、遠觀、三花品評、嘆息', () => {
  const st = id => P.find(p => p.id === id).story.join('');
  assert.ok(st('baihua').includes('周敦頤') && st('baihua').includes('濂溪先生'));
  assert.ok(st('ju').includes('陶淵明') && st('ju').includes('辭了官') && st('ju').includes('深秋'));
  assert.ok(st('mudan').includes('長安') && st('mudan').includes('稅'));
  assert.ok(st('yuni').includes('淤泥') && st('yuni').includes('妖豔'));
  assert.ok(st('jing').includes('蓮藕') && st('jing').includes('攀附'));
  assert.ok(st('xiang').includes('孩子') && st('xiang').includes('遠一點欣賞'));
  assert.ok(st('pin').includes('菊') && st('pin').includes('牡丹') && st('pin').includes('君子'));
  assert.ok(st('lianxi').includes('唉') && st('lianxi').includes('愛蓮的人'));
});
test('shots 與 story 同長度、每格是元素 id 或 null', () => P.forEach(p => {
  assert.ok(Array.isArray(p.shots), p.id + ' 沒有 shots');
  assert.equal(p.shots.length, p.story.length, p.id + ' shots 長度');
  const ids = p.elements.map(e => e.id);
  p.shots.forEach((x, i) => assert.ok(x === null || ids.includes(x), `${p.id} 第 ${i + 1} 段 shots 不合法：${x}`));
}));
test('每站有思考題 think（問句）', () => P.forEach(p => assert.ok(p.think && len(p.think) >= 15 && p.think.includes('？'), p.id)));
test('gloss：每站有原文字詞與白話生詞，都出現在原文、故事或元素介紹裡', () => P.forEach(p => {
  const txt = p.story.join('') + p.elements.map(e => e.desc).join('');
  const ks = Object.keys(p.gloss), inY = ks.filter(k => p.yuan.includes(k));
  assert.ok(inY.length >= 2, p.id + ' 原文註解太少');
  assert.ok(ks.length > inY.length, p.id + ' 沒有白話生詞');
  ks.forEach(k => { assert.ok(p.yuan.includes(k) || txt.includes(k), `${p.id} 生詞「${k}」沒出現`); assert.ok(len(p.gloss[k]) >= 2, k); });
}));
test('契約列出的原文字詞都有註解', () => {
  const g = Object.assign({}, ...P.map(p => p.gloss));
  '蕃 獨 李唐 淤泥 染 濯 清漣 妖 蔓 枝 益 亭亭 淨植 褻玩 焉 謂 隱逸 噫 鮮 宜乎'.split(' ').forEach(k => assert.ok(g[k], k));
});
test('三種花・三種人統整表', () => {
  assert.equal(s.D.adults.map(a => a.who).join(), '菊,牡丹,蓮');
  s.D.adults.forEach(a => assert.ok(len(a.cares) >= 8 && len(a.prince) >= 8, a.who));
});
test('介面沒有前作殘留、沒有英文版、localStorage 改 als-v1', () => {
  const ui = ['parts/ui.html', 'parts/ui.js', 'parts/ui.css'].map(f => fs.readFileSync(f, 'utf8')).join('');
  assert.equal(/小王子|B612|候鳥|星球|綠野仙蹤|奧茲|桃樂絲|堪薩斯|黃磚|龍捲風|托托|銀鞋|稻草人|\bOz\b|oz-|Dorothy/.test(ui), false);
  assert.equal(/ui-lang|ui-level|is-en|LP_EN|voice-en|data-en/.test(ui), false, '英文版殘留');
  assert.ok(ui.includes('ui-mode-gu') && ui.includes('ui-quiz') && ui.includes('ui-cert'), '古文／白話切換、測驗、證書');
  assert.ok(ui.includes("'als-v1'"));
  assert.equal(/桃[花]|漁[人]|武[陵]|taohua[y]uan|thy[-]v1/.test(ui), false, '前作殘留');
  assert.ok(ui.includes('ailianshuo-certificate.png') && ui.includes('周敦頤'), '證書');
  assert.ok(ui.includes('ctx.goHome'), '結尾要呼叫 ctx.goHome');
  assert.ok(ui.includes('三種花・三種人'));
  // 第二輪換成陋室銘引擎：不得留下陋室銘的主角、坐騎與存檔前綴（〈陋室銘〉只能在結尾「延伸閱讀」出現）
  assert.equal(/劉禹錫|仙鶴|乘鶴|lushiming|仙山|德馨|山不在高|六站|六座/.test(ui), false, '陋室銘殘留');
  assert.equal(/[舟篙划]|船/.test(ui), false, '第一輪划舟殘留');
  assert.ok(ui.includes('騎蛙跳往'), '按鈕寫「騎蛙跳往〇〇」');
  assert.ok(ui.includes('愛蓮說・蓮池蛙躍') && ui.includes('濂溪先生') && ui.includes('119') && ui.includes('託物言志') && !ui.includes('托物言志'), '標題與導讀卡（台灣用字「託」）');
  assert.ok(ui.includes("g.fillText('君', 0, -6); g.fillText('子', 0, 46);") && ui.includes('>君</text>'), '朱印「君子」');
  assert.ok(ui.includes('八站全部過關') && ui.includes('原著：〈愛蓮說〉（北宋・周敦頤）'), '八站與頁尾原著');
});
test('證書兩版：文言「結業狀」、白話「結業證書」，八站四個一排、依版本＋名字快取', () => {
  const js = fs.readFileSync('parts/ui.js', 'utf8'), html = fs.readFileSync('parts/ui.html', 'utf8');
  assert.ok(js.includes('結業狀') && js.includes('結業證書') && js.includes('ailianshuo-jieyezhuang.png'));
  assert.ok(html.includes('ui-cert-ver-gu') && html.includes('ui-cert-ver-bai'), '表單版本選擇');
  assert.ok(js.includes("ver + '|' + st.name"), 'PNG 依版本＋名字快取');
  assert.ok(js.includes("'hero'") && js.includes('i % 4'), '主角照 cert/hero.jpg、成績四個一排');
});
test('白話沒有划舟撐篙殘留', () => assert.equal(/[舟篙划船]/.test(all + JSON.stringify(s.D.quiz)), false));
test('每站 5 題測驗：四選項不重複、正解索引合法、有解析、全形標點', () => P.forEach(p => {
  const qs = s.D.quiz[p.id]; assert.equal(qs && qs.length, 5, p.id);
  qs.forEach((q, i) => {
    const t = `${p.id} 第 ${i + 1} 題`;
    assert.ok(q.q.endsWith('？'), t + ' 題目要是問句');
    assert.equal(q.c.length, 4, t); assert.equal(new Set(q.c).size, 4, t + ' 選項重複');
    assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, t);
    assert.ok(q.why && len(q.why) >= 8, t + ' 解析');
    assert.equal(/[,;:!?]/.test(q.q + q.c.join('') + q.why), false, t + ' 半形標點');
    assert.equal(/[们这说时门发过来对么为会还没让见给开关样头]/.test(q.q + q.c.join('') + q.why), false, t + ' 簡體字');
  });
}));
test('頁面標題、description、載入字樣是本作（第三輪 S3）', () => {
  const sh = fs.readFileSync('src/shell.html', 'utf8'), boot = fs.readFileSync('src/boot.js', 'utf8');
  const head = sh.match(/<title>[\s\S]*?name="description"[^>]*>/)[0];
  assert.ok(head.includes('周敦頤') && head.includes('愛蓮說') && head.includes('八片荷葉'), head);
  assert.equal(/劉禹錫|仙鶴|陋室|乘鶴|仙山/.test(head + boot), false, '陋室銘殘留');
  assert.ok(boot.includes('周敦頤騎蛙'));
});
test('無障礙（第三輪）：段落不整段 aria-live、不自動開證書、不聚焦姓名框', () => {
  const js = fs.readFileSync('parts/ui.js', 'utf8'), html = fs.readFileSync('parts/ui.html', 'utf8');
  assert.equal(/id="ui-para"[^>]*aria-live/.test(html), false);
  assert.ok(html.includes('id="ui-sr" role="status"'));
  assert.equal(js.includes("$('ui-quiz-cert').click()"), false, '不自動點證書');
  assert.equal(js.includes("$('ui-cert-name').focus"), false, '不聚焦姓名框');
});
