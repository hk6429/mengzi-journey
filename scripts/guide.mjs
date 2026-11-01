// 產生 public/guide.html：全部故事的文字版（不需 WebGL）。scripts/build.mjs 會自動呼叫。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root = path.resolve(import.meta.dirname, '..');
const s = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'src/data.js'), 'utf8') + ';globalThis.D=DATA;', s);
const D = s.D;
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KIND = { character: '角色', building: '建築', scene: '場景' };
// 朗讀檔：有就在每段後面附播放器（服務閱讀困難的學生）
let voice = {}; try { voice = JSON.parse(fs.readFileSync(path.join(root, 'public/voice/manifest.json'), 'utf8')).files || {}; } catch {}
const toc = D.planets.map(p => `<li><a href="#${p.id}">${esc(p.name)}</a></li>`).join('') + '<li><a href="#worksheet">學習單</a></li><li><a href="teacher.html">教師指引</a></li>';
// 原文只標原文字詞、白話只標白話生詞（同 UI 規則）
const glossOf = p => Object.entries(p.gloss);
const secs = D.planets.map(p => `<section id="${p.id}">
<p class="num">第 ${p.num} 站</p><h2>${esc(p.name)}</h2><p class="sub">${esc(p.sub)}</p>
<div class="yuan"><b>原文</b><p>${esc(p.yuan)}</p></div>
<p class="bai">白話故事</p>
${p.story.map((t, i) => `<p>${esc(t)}</p>` + (voice[`${p.id}-${i + 1}`] ? `<audio controls preload="none" src="voice/${p.id}-${i + 1}.mp3" aria-label="朗讀第 ${i + 1} 段"></audio>` : '')).join('\n')}
<p class="think"><b>想一想</b>${esc(p.think)}</p>
<h3>註解</h3><dl class="gloss">${glossOf(p).map(([k, v]) => `<dt>${esc(k)}${p.yuan.includes(k) ? '<small>原文</small>' : ''}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
<h3>這一站有</h3><dl>${p.elements.map(e => `<dt>${esc(e.name)}<small>${KIND[e.kind] || ''}</small></dt><dd>${esc(e.desc)}</dd>`).join('')}</dl>
${p.next ? `<p class="next">${esc(p.next)}</p>` : ''}
<p class="back"><a href="index.html?planet=${p.id}">到 3D 場景看這一站</a></p>
</section>`).join('\n');
// 學習單：思考題＋三種花・三種人統整表＋原文字詞＋寫作題，留白作答；@media print 只印這一節
const line = n => '<div class="ans"></div>'.repeat(n);
const words = ['可愛者甚蕃', '晉陶淵明獨愛菊', '自李唐來', '出淤泥而不染', '濯清漣而不妖', '不蔓不枝', '香遠益清', '可遠觀而不可褻玩焉', '陶後鮮有聞', '宜乎眾矣'];
const ws = `<section id="worksheet" class="ws">
<h2>〈愛蓮說〉學習單</h2><p class="who">班級＿＿＿＿　座號＿＿＿＿　姓名＿＿＿＿＿＿＿＿</p>
<h3>一、每站想一想</h3><ol>${D.planets.map(p => `<li><b>${esc(p.name)}</b>：${esc(p.think)}${line(2)}</li>`).join('')}</ol>
<h3>二、原文字詞：用自己的話解釋這些原文</h3>
<table><thead><tr><th>原文</th><th>我的解釋</th></tr></thead><tbody>${words.map(w => `<tr><th>${esc(w)}</th><td></td></tr>`).join('')}</tbody></table>
<h3>三、三種花・三種人</h3>
<table><thead><tr><th>花</th><th>象徵哪種人、為什麼</th><th>誰愛它、作者怎麼感嘆</th></tr></thead><tbody>${D.adults.map(a => `<tr><th>${esc(a.who)}</th><td></td><td></td></tr>`).join('')}</tbody></table>
<h3>四、寫一寫</h3><p>學周敦頤「託物言志」：選一樣你喜歡的東西（植物、動物、器物都可以），先寫出它的兩三個特點，再說說這些特點像什麼樣的人、你為什麼想成為那樣的人。寫一段話，最後用一句感嘆收尾。</p>${line(6)}
<p class="noprint"><button type="button" onclick="print()">列印學習單</button></p>
</section>`;
const foot = `<footer><p>製作：${esc(D.author.name)}・<a href="${esc(D.author.works)}" target="_blank" rel="noopener">大乃作品島</a></p>
<p>原著：周敦頤〈愛蓮說〉（北宋），已屬公共領域。白話故事與註解皆為重新改寫，未抄錄任何課本語譯、注釋或坊間譯本。</p></footer>`;
const html = `<!doctype html>
<html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(D.title)}｜文字版故事</title><meta name="description" content="周敦頤〈愛蓮說〉八站文字版：原文與白話故事並列，附註解、朗讀與學習單。">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>
:root{color-scheme:light}
body{margin:0;background:#f7f0dd;color:#2f2618;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;line-height:1.95;font-size:17px}
main{max-width:720px;margin:0 auto;padding:32px 16px 64px}
a{color:#8a4f12}
h1{font-size:30px;letter-spacing:.1em;margin:0}h2{font-size:24px;margin:0}h3{font-size:16px;color:#6e5a44;margin:24px 0 6px}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.top a,.back a{display:inline-flex;align-items:center;min-height:44px}
nav ol{columns:2;padding-left:1.2em}nav li{min-height:36px}
section{border-top:1px solid #d9c9a6;padding-top:28px;margin-top:28px}
.num{color:#a24a35;font-size:13px;letter-spacing:.2em;margin:0}.sub{color:#6e5a44;margin:0 0 12px}
.yuan{border-left:4px solid #b9a582;background:#fffaf0;padding:8px 14px;margin:8px 0 16px}.yuan b,.bai{font-size:13px;letter-spacing:.2em;color:#a24a35}
.yuan p{margin:2px 0 0;font-family:"BiauKai","TW-Kai","Kaiti TC","STKaiti","DFKai-SB",serif;font-size:19px;letter-spacing:.05em}
.bai{margin:0;font-weight:700}
dt{font-weight:700}dt small{margin-left:8px;color:#a24a35;font-weight:400;font-size:12px}dd{margin:0 0 10px;color:#4a3a2b}
.next{font-style:italic;color:#6e5a44}
audio{display:block;width:100%;max-width:420px;height:40px;margin:-4px 0 14px}
.think{border:1px dashed #a24a35;border-radius:12px;padding:10px 14px;background:#fffaf0}.think b{display:block;color:#a24a35;font-size:13px;letter-spacing:.2em}
.ws table{width:100%;border-collapse:collapse;margin-bottom:8px}.ws th,.ws td{border:1px solid #b9a582;padding:6px 8px;text-align:left;vertical-align:top}.ws td{height:2.4em}
.ws .ans{border-bottom:1px solid #b9a582;height:2.2em}
.ws button{font:inherit;min-height:44px;padding:0 18px;border-radius:12px;border:0;background:#8a4f12;color:#fff;font-weight:700;cursor:pointer}
@media print{
  :root{color-scheme:light}
  body{background:#fff;color:#000;font-size:12pt;line-height:1.6}
  main>*:not(.ws){display:none!important}
  .ws{border:0;margin:0;padding:0}.ws h2{font-size:18pt}.ws h3{color:#000;font-size:13pt}
  .ws th,.ws td{border:1px solid #555}.ws td{height:3em}.ws .ans{border-bottom:1px solid #999}
  .ws li{break-inside:avoid}.noprint{display:none}
}
footer{border-top:1px solid #d9c9a6;margin-top:40px;padding-top:16px;font-size:14px;color:#6e5a44}
@media(max-width:500px){nav ol{columns:1}}
</style></head><body><main>
<div class="top"><div><h1>${esc(D.title)}</h1><p class="sub">${esc(D.sub)}・文字版</p></div><a href="index.html">回 3D 場景</a></div>
<p>周敦頤字茂叔，北宋理學家，晚年在廬山下築書堂，人稱濂溪先生。〈愛蓮說〉先比較菊與牡丹，再寫自己獨愛蓮，以蓮自比，是託物言志的名篇。每一站先讀原文，再讀周敦頤用自己的話說的白話故事。</p>
<nav aria-label="目錄"><ol>${toc}</ol></nav>
${secs}
${ws}
${foot}
</main></body></html>
`;
fs.writeFileSync(path.join(root, 'public/guide.html'), html);
fs.writeFileSync(path.join(root, 'public/teacher.html'), teacher());
// 教師指引：教學目標、2 節課流程、各站提問、寫作手法、延伸（出淤泥而不染、〈飲酒〉、〈陋室銘〉）
function teacher() {
  const ask = {
    baihua: '「水陸草木之花，可愛者甚蕃」：作者為什麼先寫「百花很多」？這和後面只挑三種花來談有什麼關係？',
    ju: '「晉陶淵明獨愛菊」：「獨」字透露了什麼？菊的哪些特點，和陶淵明辭官歸隱的人生相像？',
    mudan: '「自李唐來，世人甚愛牡丹」：「世人」和上一句的「陶淵明」一多一少，作者想讓讀者注意到什麼？',
    yuni: '「出淤泥而不染，濯清漣而不妖」：兩句分別寫蓮在怎樣的環境裡？各比喻君子的哪一種修養？',
    jing: '「中通外直，不蔓不枝」：蓮莖的外形怎麼對應到人的內心與行為？請各舉一個生活中的例子。',
    xiang: '「香遠益清，亭亭淨植，可遠觀而不可褻玩焉」：香氣、姿態、距離感，分別寫出君子的什麼特質？',
    pin: '「菊，花之隱逸者也；牡丹，花之富貴者也；蓮，花之君子者也」：為什麼把蓮放在最後？三句結構相同、接連排列，是什麼修辭（排比）？',
    lianxi: '結尾的順序是菊、蓮、牡丹，和前面「菊、牡丹、蓮」不同，為什麼把「牡丹之愛，宜乎眾矣」放在最後？「同予者何人」是激問，答案在哪裡？「菊之愛」為什麼等於「愛菊」？'
  };
  return `<!doctype html>
<html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(D.title)}｜教師指引</title><meta name="description" content="〈愛蓮說〉3D 繪本教師指引：教學目標、課堂流程、各站提問、寫作手法、延伸閱讀。">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>body{margin:0;background:#fbf6ea;color:#2f2618;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;line-height:1.9;font-size:17px}
main{max-width:760px;margin:0 auto;padding:32px 16px 64px}a{color:#8a4f12}h1{font-size:28px;margin:0}h2{font-size:21px;margin:32px 0 8px;border-top:1px solid #d9c9a6;padding-top:20px}
table{width:100%;border-collapse:collapse;font-size:15px}th,td{border:1px solid #d9c9a6;padding:6px 8px;text-align:left;vertical-align:top}
.top a{display:inline-flex;min-height:44px;align-items:center;margin-right:16px}.warn{background:#fff1e0;border-left:4px solid #a24a35;padding:10px 14px}
footer{border-top:1px solid #d9c9a6;margin-top:40px;padding-top:16px;font-size:14px;color:#6e5a44}</style></head><body><main>
<p class="top"><a href="guide.html">文字版故事</a><a href="guide.html#worksheet">學習單</a><a href="index.html">3D 場景</a></p>
<h1>教師指引</h1><p>適用：國中八年級。網站以周敦頤第一人稱，把〈愛蓮說〉分成八站，想像他騎著一隻大青蛙，在仙界蓮池的大荷葉之間跳躍訪花：先到百花水鄉，再拜訪陶淵明的菊、長安的牡丹，最後回到自己的蓮塘與書堂。每站原文與白話並列；白話是重新改寫的導讀，不是逐字翻譯，課堂上仍以原文為主。騎蛙訪花是為了串起全文的想像情節，原文並沒有這趟旅程，青蛙也只是想像的坐騎，不是典故。</p>
<h2>教學目標</h2>
<ol><li>能讀懂原文，掌握「蕃、獨、李唐、淤泥、染、濯、清漣、妖、蔓、枝、益、亭亭、淨植、褻玩、謂、隱逸、噫、鮮、宜乎」等重要字詞與字音。</li>
<li>能說出菊、牡丹、蓮分別象徵的三種人（隱逸者、富貴者、君子），完成「三種花・三種人」統整表。</li>
<li>能分辨正襯（以菊襯蓮）、反襯（以牡丹襯蓮）與對比的寫法，理解「託物言志」。</li>
<li>能說出作者以蓮自比的心志，並仿照寫一段託物言志的短文。</li></ol>
<h2>建議 2 節課流程</h2>
<table><tr><th>節次</th><th>內容</th></tr>
<tr><td>第 1 節（45 分）</td><td>5 分：導讀卡介紹周敦頤（北宋理學家、濂溪先生）與「說」這種文體。<br>30 分：分組走第 1–4 站，先讀原文、點註解，再讀白話；每站討論「想一想」，完成測驗。<br>10 分：學習單第二大題（原文字詞）。</td></tr>
<tr><td>第 2 節（45 分）</td><td>20 分：走第 5–8 站，重點放在蓮的形象如何一步步對應君子品格，以及結尾三句的語氣。<br>15 分：完成「三種花・三種人」統整表，全班討論正襯、反襯與對比。<br>10 分：寫作「託物言志」短文。</td></tr></table>
<h2>各站提問</h2>
<table><tr><th>站</th><th>原文</th><th>提問</th></tr>${D.planets.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.yuan)}</td><td>${esc(ask[p.id] || p.think)}</td></tr>`).join('')}</table>
<h2>寫作手法</h2>
<table><tr><th>手法</th><th>在本文哪裡</th><th>效果</th></tr>
<tr><td>託物言志</td><td>全文寫蓮，其實寫作者自己想做的君子</td><td>把抽象的品格化成看得見的花，含蓄又具體</td></tr>
<tr><td>正襯</td><td>以陶淵明愛菊陪襯作者愛蓮</td><td>菊和蓮都不慕名利，用相近的事物烘托蓮的高潔；但菊退隱、蓮入世不染，仍有層次之別</td></tr>
<tr><td>反襯</td><td>以世人愛牡丹反襯作者愛蓮</td><td>富貴熱鬧與清白自持相反，蓮的形象因此更鮮明</td></tr>
<tr><td>對比</td><td>結尾「鮮有聞」「何人」「眾矣」</td><td>愛菊者少、愛蓮者更少、愛牡丹者多，在數量的對比中透出感慨</td></tr>
<tr><td>由面到點</td><td>先寫「水陸草木之花」，再收到菊、牡丹、蓮</td><td>從眾花中層層聚焦，讓蓮壓軸出場</td></tr>
<tr><td>映襯</td><td>出淤泥「而不染」、濯清漣「而不妖」</td><td>環境與表現相反，凸顯蓮不受環境左右</td></tr>
<tr><td>排比</td><td>「菊，花之隱逸者也；牡丹，花之富貴者也；蓮，花之君子者也」</td><td>三句結構相同，一氣呵成，三花三人並列比較</td></tr>
<tr><td>激問</td><td>「蓮之愛，同予者何人？」</td><td>答案在問題反面（幾乎沒有人），感嘆知音難尋</td></tr>
<tr><td>倒裝</td><td>「菊之愛」「蓮之愛」「牡丹之愛」</td><td>「之」把賓語提前，「菊之愛」＝「愛菊」，三句句式整齊</td></tr>
<tr><td>順序調換</td><td>前面評語是菊→牡丹→蓮，結尾感嘆改為菊→蓮→牡丹</td><td>把「牡丹之愛，宜乎眾矣」放在最後，讓諷刺與感慨落在全文最末</td></tr>
<tr><td>長句統領</td><td>「予獨愛蓮之」統領「出淤泥而不染」到「不可褻玩焉」七個短句</td><td>第 04–06 站切開了這個長句，教學時提醒學生：這些都是作者愛蓮的理由</td></tr></table>
<h2>常見迷思</h2>
<ol><li>「可愛」是值得喜愛，不是今天說的「萌」。</li><li>「鮮有聞」的「鮮」讀ㄒㄧㄢˇ（少），不讀ㄒㄧㄢ。</li><li>「不蔓不枝」的「蔓」讀ㄇㄢˋ，當動詞。</li><li>「出淤泥而不染」用來稱讚別人，不宜用來稱讚自己。</li><li>「中通外直」寫的是挺出水面的荷梗（花莖、葉柄），不是地下的藕。</li><li>「託物言志」用「託」（寄託），「托」用在托盤、襯托。</li></ol>
<h2>延伸一：成語「出淤泥而不染」</h2>
<p>今天常用「出淤泥而不染」稱讚在不良環境中仍能保持清白的人。請學生各造一個句子，並想一想：這句話用在什麼情境最恰當？用來稱讚自己，會不會有點奇怪？也可補充本篇其他常用語，例如「亭亭玉立」與「亭亭淨植」、「可遠觀而不可褻玩」的今天用法。</p>
<h2>延伸二：陶淵明〈飲酒〉其五</h2>
<p>讀陶淵明「采菊東籬下，悠然見南山」等句，請學生找出詩中讓人感到悠閒、遠離塵囂的字詞，再和第二站的白話故事對照：周敦頤敬佩陶淵明，為什麼卻沒有選擇像他一樣隱居？引導學生體會「隱逸」與「君子」兩種人生態度的差別。</p>
<h2>延伸三：與〈陋室銘〉對照</h2>
<table><tr><th></th><th>〈愛蓮說〉（周敦頤）</th><th>〈陋室銘〉（相傳劉禹錫）</th></tr>
<tr><td>借什麼</td><td>借花（蓮）</td><td>借居所（簡陋的屋子）</td></tr>
<tr><td>言什麼志</td><td>身在世間而不受汙染、正直通達的君子品格</td><td>安貧樂道、重視德行而不在乎物質</td></tr>
<tr><td>結尾</td><td>以感嘆「同予者何人」收束</td><td>以「何陋之有」反問收束</td></tr>
<tr><td>文體</td><td>說：借一樣東西議論、說出道理</td><td>銘：原本刻在器物上提醒自己，句短押韻</td></tr></table>
<p>兩篇都是託物言志。〈陋室銘〉一般認為是唐代劉禹錫所作，作者另有崔沔一說。</p>
<p>討論：兩篇都很短，都用一樣東西說自己的志向。你覺得哪一篇的「物」和「志」連得更緊密？為什麼？</p>
<p class="warn"><b>討論提醒：</b>談「你想做哪一種人」時，不必把隱逸或追求富貴說成錯誤；重點放在說出理由。三種人生都有人選擇，課堂上鼓勵學生思考，而不是評價對錯。</p>
<h2>學習單</h2>
<p><a href="guide.html#worksheet">文字版的學習單</a>可直接列印（瀏覽器列印時只會印學習單）。</p>
${answers()}
${foot}
</main></body></html>
`;
}
// 教師版參考答案：每站想一想、學習單第二（字詞）與第三（統整表）大題；思考題是開放題，只給方向
function answers() {
  const think = {
    baihua: '先寫百花眾多，再從中挑出菊、牡丹、蓮，由面到點聚焦，蓮最後才出場更顯重要。選花題開放作答，重點是說出花的特點和自己相像之處。',
    ju: '相像：都不追逐名利、品格高潔。不同：陶淵明辭官退隱田園，作者則在世間當地方官，身在官場仍保持清白（菊＝隱逸，蓮＝君子）。',
    mudan: '牡丹代表富貴名利，和蓮的清白自持相反；有了熱鬧的牡丹作對照，蓮的安靜、不慕名利更鮮明（反襯）。學生說「不一定更清楚」也可，只要說出理由。',
    yuni: '開放作答。可舉在不良同儕壓力下仍守規矩的同學、拒絕收賄的公務員等；提醒學生說明「環境哪裡不好」「他怎麼守住原則」。',
    jing: '〈陋室銘〉借陋室寫安貧樂道；于謙〈石灰吟〉借石灰寫不怕犧牲、要留清白；國小詠物詩如〈詠鵝〉〈梅花〉等也可。',
    xiang: '遠觀表示欣賞與尊重，褻玩是輕慢、會糟蹋花；君子莊重，別人自然敬重而不敢隨便。生活例子：師長、長輩、古蹟、自然生態等。',
    pin: '開放作答。可以引導：隱逸要放下名利，富貴要付出代價，君子要在誘惑中守住自己，最需要自制力；重點在說出理由，不評價對錯。',
    lianxi: '開放作答。說變多：例如有人拒絕不當利益、堅持誠實；說變少：例如網路追求流量、炫富。重點在用例子對照「愛蓮＝不慕名利、潔身自愛」。'
  };
  const word = {
    '可愛者甚蕃': '值得喜愛的花非常多。（蕃，讀ㄈㄢˊ，多）',
    '晉陶淵明獨愛菊': '東晉的陶淵明特別喜愛菊花。（獨，特別、唯獨）',
    '自李唐來': '從唐朝以來。（李唐，唐朝皇帝姓李）',
    '出淤泥而不染': '從爛泥裡長出來，卻不被沾染弄髒。（淤，讀ㄩ）',
    '濯清漣而不妖': '在清水波紋中洗過，卻不顯得妖豔輕浮。（濯，讀ㄓㄨㄛˊ，洗）',
    '不蔓不枝': '不長藤蔓、不生旁枝。（蔓，讀ㄇㄢˋ；蔓、枝都當動詞）',
    '香遠益清': '香氣傳得越遠越清淡。（益，更加）',
    '可遠觀而不可褻玩焉': '可以遠遠欣賞，卻不可以靠近隨意玩弄。（褻，讀ㄒㄧㄝˋ，不莊重；焉，句末語氣詞）',
    '陶後鮮有聞': '陶淵明以後，很少聽說了。（鮮，讀ㄒㄧㄢˇ，少）',
    '宜乎眾矣': '當然很多了。（宜乎，當然；眾，多）'
  };
  return `<h2>參考答案（教師版）</h2>
<h3>一、每站想一想</h3><table><tr><th>站</th><th>參考方向</th></tr>${D.planets.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(think[p.id] || '')}</td></tr>`).join('')}</table>
<h3>二、原文字詞</h3><table><tr><th>原文</th><th>參考解釋</th></tr>${words.map(w => `<tr><td>${esc(w)}</td><td>${esc(word[w] || '')}</td></tr>`).join('')}</table>
<h3>三、三種花・三種人</h3><table><tr><th>花</th><th>象徵哪種人、為什麼</th><th>誰愛它、作者怎麼感嘆</th></tr>${D.adults.map(a => `<tr><td>${esc(a.who)}</td><td>${esc(a.cares)}</td><td>${esc(a.prince)}</td></tr>`).join('')}</table>`;
}
// 朗讀清單不存在時放一份空的，前端才不會請求到 404（tools/gen-voice.mjs 會覆寫）
const mf = path.join(root, 'public/voice/manifest.json');
if (!fs.existsSync(mf)) { fs.mkdirSync(path.dirname(mf), { recursive: true }); fs.writeFileSync(mf, '{"voice":null,"files":{}}\n'); }
console.log('built public/guide.html、public/teacher.html');
