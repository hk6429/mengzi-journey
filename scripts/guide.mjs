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
// 學習單：思考題＋原文字詞＋六個人的起點＋論證層次＋反思寫作，留白作答；@media print 只印這一節
const line = n => '<div class="ans"></div>'.repeat(n);
const words = ['舜發於畎畝之中', '傅說舉於版築之間', '管夷吾舉於士', '天將降大任於是人也', '苦其心志，勞其筋骨', '行拂亂其所為', '動心忍性', '曾益其所不能', '困於心，衡於慮，而後作', '徵於色，發於聲，而後喻', '入則無法家拂士', '生於憂患，而死於安樂也'];
const levels = [['人物事例', '六個人從不同處境受到任用'], ['提出論點', '將降大任者，必先經歷困境'], ['說明原因', '動心忍性，增長原本不能的能力'], ['個人', '犯錯、困惑之後改正、奮起'], ['國家', '內有法家拂士、外有敵國外患'], ['結論', '生於憂患，死於安樂']];
const ws = `<section id="worksheet" class="ws">
<h2>〈生於憂患，死於安樂〉學習單</h2><p class="who">班級＿＿＿＿　座號＿＿＿＿　姓名＿＿＿＿＿＿＿＿</p>
<h3>一、每站想一想</h3><ol>${D.planets.map(p => `<li><b>${esc(p.name)}</b>：${esc(p.think)}${line(2)}</li>`).join('')}</ol>
<h3>二、原文字詞：用自己的話解釋這些原文</h3>
<table><thead><tr><th>原文</th><th>我的解釋</th></tr></thead><tbody>${words.map(w => `<tr><th>${esc(w)}</th><td></td></tr>`).join('')}</tbody></table>
<h3>三、六個人的起點</h3>
<table><thead><tr><th>人物</th><th>原本的處境</th><th>後來被誰任用</th></tr></thead><tbody>${D.adults.map(a => `<tr><th>${esc(a.who)}</th><td></td><td></td></tr>`).join('')}</tbody></table>
<h3>四、論證的層次：作者怎麼一步步推到結論</h3>
<table><thead><tr><th>層次</th><th>作者提出的重點</th><th>我的想法（同意、保留或例外）</th></tr></thead><tbody>${levels.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td><td></td></tr>`).join('')}</tbody></table>
<h3>五、寫一寫</h3><ol><li>用自己的話解釋「生於憂患，死於安樂」，並說說你同不同意，理由是什麼？有沒有例外？${line(3)}</li>
<li>困境中，哪些人、方法或資源能幫助一個人？日子平穩時，又可以做哪些準備？寫下一個你可以採取的行動。${line(3)}</li></ol>
<p class="tip">不必寫出不想公開的個人經驗，也可以用假設的情境作答。</p>
<p class="noprint"><button type="button" onclick="print()">列印學習單</button></p>
</section>`;
const foot = `<footer><p>製作：${esc(D.author.name)}・<a href="${esc(D.author.works)}" target="_blank" rel="noopener">大乃作品島</a></p>
<p>原文：《孟子・告子下》（戰國・孟子），已屬公共領域；採國家教育研究院示例「是人」版本。白話故事、註解與題目皆為重新改寫，未抄錄任何課本語譯、注釋或坊間譯本。</p></footer>`;
const html = `<!doctype html>
<html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(D.title)}｜文字版故事</title><meta name="description" content="《孟子・告子下》〈生於憂患，死於安樂〉六站文字版：原文與白話故事並列，附註解、朗讀與學習單。">
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
.ws .ans{border-bottom:1px solid #b9a582;height:2.2em}.ws .tip{color:#6e5a44;font-size:15px}
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
<p>孟子名軻，戰國中期鄒國人，儒家的重要人物，後人尊稱「亞聖」。本文選自《孟子・告子下》，先舉六個人的例子，再說明困境如何使人增長能力，接著從個人推到國家，最後得出「生於憂患，死於安樂」的結論。每一站先讀原文，再讀孟子用自己的話說的白話故事。原文有「是人」「斯人」兩種版本，本站採「是人」。</p>
<nav aria-label="目錄"><ol>${toc}</ol></nav>
${secs}
${ws}
${foot}
</main></body></html>
`;
fs.writeFileSync(path.join(root, 'public/guide.html'), html);
fs.writeFileSync(path.join(root, 'public/teacher.html'), teacher());
// 教師指引：文本與版本、教學目標、論證路徑、語文觀察、2 節課流程、各站提問、照顧提醒、評量、場景與年代、來源、參考答案
function teacher() {
  const ask = {
    fields: '「舜發於畎畝之中，傅說舉於版築之間」：「發」和「舉」意思相近，為什麼要換字？兩人的出身有什麼共同點？',
    market: '六個人名接連排列（舉例論證）：這些例子能支持什麼主張？從幾個特例推到「所有人」，還需要哪些理由？',
    road: '「苦其心志，勞其筋骨，餓其體膚，空乏其身」：句式相同、層層鋪陳（排比、層遞）。由心到身、由內到外，困難的種類怎麼一步步加重？',
    bridge: '「所以動心忍性，曾益其所不能」：這一句和前一站是什麼關係（說明困境的作用）？「曾」為什麼要讀成「增」？',
    study: '「困於心，衡於慮，而後作；徵於色，發於聲，而後喻」：從犯錯、困惑到奮起、被理解，順序透露了什麼？「衡」通哪個字？',
    city: '「入則無法家拂士，出則無敵國外患者，國恆亡」：作者為什麼從個人轉到國家？「生於憂患，死於安樂」的對比，和前面的論證怎麼接起來？'
  };
  return `<!doctype html>
<html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(D.title)}｜教師指引</title><meta name="description" content="〈生於憂患，死於安樂〉3D 古文繪本教師指引：版本與字音、教學目標、論證路徑、各站提問、照顧提醒與參考答案。">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>body{margin:0;background:#fbf6ea;color:#2f2618;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;line-height:1.9;font-size:17px}
main{max-width:760px;margin:0 auto;padding:32px 16px 64px}a{color:#8a4f12}h1{font-size:28px;margin:0}h2{font-size:21px;margin:32px 0 8px;border-top:1px solid #d9c9a6;padding-top:20px}
table{width:100%;border-collapse:collapse;font-size:15px}th,td{border:1px solid #d9c9a6;padding:6px 8px;text-align:left;vertical-align:top}
.top a{display:inline-flex;min-height:44px;align-items:center;margin-right:16px}.warn{background:#fff1e0;border-left:4px solid #a24a35;padding:10px 14px}
footer{border-top:1px solid #d9c9a6;margin-top:40px;padding-top:16px;font-size:14px;color:#6e5a44}</style></head><body><main>
<p class="top"><a href="guide.html">文字版故事</a><a href="guide.html#worksheet">學習單</a><a href="index.html">3D 場景</a></p>
<h1>教師指引</h1><p>適用：國中九年級（依各版本課程安排調整）。網站以孟子第一人稱，把〈生於憂患，死於安樂〉分成六站，想像他乘一葉扁舟沿大河走訪六座河島。每站原文與白話並列；白話是重新改寫的導讀，不是逐字翻譯，課堂上仍以原文為主。乘舟訪島是串起全文的教學敘事，並不是孟子真實的旅程。</p>
<h2>文本與版本</h2>
<p>本文選自《孟子・告子下》。本站原文參照<a href="https://www.naer.edu.tw/upload/1/10/doc/2691/%E5%9C%8B%E4%B8%AD%E5%9C%8B%E6%96%87%E9%A0%98%E5%9F%9F%E7%B4%A0%E9%A4%8A%E5%B0%8E%E5%90%91%E8%A9%95%E9%87%8F%E9%AB%94%E9%A9%97%E8%88%87%E5%AF%A6%E4%BD%9C%E4%BD%9C%E8%80%85-%E8%A9%B9%E9%A6%A8%E6%80%A1.pdf" target="_blank" rel="noopener">國家教育研究院教學示例</a>，採「天將降大任於是人也」；另有常見的「斯人」版本，「是」「斯」都是「這」的意思，可讓學生比較。</p>
<p>字音提醒：「傅說」的「說」讀ㄩㄝˋ、「膠鬲」的「鬲」讀ㄍㄜˊ、「拂士」的「拂」讀ㄅㄧˋ（通「弼」）、「行拂亂」的「拂」讀ㄈㄨˊ、「曾益」的「曾」讀ㄗㄥ（通「增」）、「衡於慮」的「衡」通「橫」。可參考<a href="https://dict.revised.moe.edu.tw/dictView.jsp?ID=1787&amp;la=0&amp;powerMode=0" target="_blank" rel="noopener">教育部重編國語辭典</a>。</p>
<h2>教學目標</h2>
<ol><li>能讀懂原文，掌握「發、舉、士、大任、拂、曾、衡、作、徵、喻、法家拂士、恆」等重要字詞與字音。</li>
<li>能說出六位人物原本的處境與後來的任用，完成「六個人的起點」統整表。</li>
<li>能說明全文的論證路徑：舉例 → 提出論點 → 說明原因 → 推及個人與國家 → 結論；辨認舉例論證、排比與層遞、對比。</li>
<li>能用生活經驗檢驗作者的主張，提出同意、保留或例外，並理解休息、求助與外在資源的重要。</li></ol>
<h2>論證路徑</h2>
<table><tr><th>層次</th><th>原文</th><th>站</th></tr>
<tr><td>舉例論證</td><td>舜發於畎畝之中……百里奚舉於市</td><td>01、02</td></tr>
<tr><td>提出論點</td><td>故天將降大任於是人也，必先苦其心志……行拂亂其所為</td><td>03</td></tr>
<tr><td>說明原因</td><td>所以動心忍性，曾益其所不能</td><td>04</td></tr>
<tr><td>推及個人</td><td>人恆過，然後能改……而後喻</td><td>05</td></tr>
<tr><td>推及國家</td><td>入則無法家拂士，出則無敵國外患者，國恆亡</td><td>06</td></tr>
<tr><td>結論</td><td>然後知生於憂患，而死於安樂也</td><td>06</td></tr></table>
<p>可請學生指出每一步的原文，討論事例能支持什麼，以及從個人推到國家是否需要更多理由。引導學生區分作者的主張與自己的判斷：六個例子不能證明所有人都會因困境而成長。</p>
<h2>語文觀察</h2>
<table><tr><th>手法</th><th>在本文哪裡</th><th>效果</th></tr>
<tr><td>舉例論證</td><td>舜、傅說、膠鬲、管夷吾、孫叔敖、百里奚</td><td>六個不同時代、不同出身的人物，增加說服力</td></tr>
<tr><td>排比</td><td>「○於○○之中」「舉於○」六句</td><td>句式整齊、氣勢連貫，例子一個接一個</td></tr>
<tr><td>層遞</td><td>苦其心志 → 勞其筋骨 → 餓其體膚 → 空乏其身 → 行拂亂其所為</td><td>從內心到身體、從生活到做事，困境層層加深</td></tr>
<tr><td>對比</td><td>生／死、憂患／安樂；入／出</td><td>結論鮮明，國內國外兩面對照</td></tr>
<tr><td>由個人到國家</td><td>05 站談個人改過，06 站談國家興亡</td><td>把道理從個人修養推廣到治國</td></tr></table>
<h2>建議 2 節課流程</h2>
<table><tr><th>節次</th><th>內容</th></tr>
<tr><td>第 1 節（45 分）</td><td>5 分：導讀卡介紹孟子與本文出處、「是人／斯人」版本。<br>30 分：分組走第 1–3 站，先讀原文、點註解，再讀白話；完成「六個人的起點」與各站測驗。<br>10 分：討論「這六個例子能證明所有人嗎？」</td></tr>
<tr><td>第 2 節（45 分）</td><td>20 分：走第 4–6 站，重點放在「說明原因」與「由個人推到國家」。<br>15 分：完成學習單第四大題「論證的層次」，全班分享同意、保留或例外。<br>10 分：寫作題，寫下一個具體的準備或求助方式。</td></tr></table>
<h2>各站提問</h2>
<table><tr><th>站</th><th>原文</th><th>提問</th></tr>${D.planets.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.yuan)}</td><td>${esc(ask[p.id] || p.think)}</td></tr>`).join('')}</table>
<h2>常見迷思</h2>
<ol><li>「舉」是選拔、任用，不是舉起。</li><li>「士」在「管夷吾舉於士」中指獄官，不是讀書人。</li><li>「拂士」的「拂」讀ㄅㄧˋ，「行拂亂」的「拂」讀ㄈㄨˊ，兩處不同。</li><li>「曾益其所不能」的「曾」通「增」，讀ㄗㄥ，不是「曾經」。</li><li>舜、傅說的事蹟屬於傳說，不宜當成可確證的史實。</li><li>「生於憂患」不是說受苦越多越好，而是說憂患意識使人警覺、奮發。</li></ol>
<p class="warn"><b>照顧提醒：</b>苦難不必然使人成長，也可能造成傷害；休息、求助、他人的陪伴與制度資源同樣重要。討論時允許學生用假設情境，不要求公開私事，也不要把苦難說成成功的保證。若學生表達正在遭遇困難，請依學校既有的輔導與支持流程協助。</p>
<h2>評量與操作</h2>
<p>各站五題須全部作答才能交卷，答對 3 題以上算過站，可重考；六站都過關可領文言版「結業狀」或白話版「結業證書」。讀完可以繼續探索，不以測驗分數限制移動。資料只存在這台裝置的瀏覽器，換裝置不會同步。評量可看是否掌握字詞、能引用原文說明論證、提出理由，不以是否同意孟子作為唯一標準。</p>
<h2>場景與年代</h2>
<p>本作以戰國時代的孟子為導覽主角；六座河島、相連的航道與木橋是教學敘事安排。夯土台基、木構建築、竹簡用來呈現戰國氛圍；原文列舉的人物跨越上古到春秋，服飾各依其時代，不應一律當成戰國人物。竹簡背景可參考中央研究院數位典藏的<a href="https://ascdc.digitalarchives.tw/collection_3334348.html" target="_blank" rel="noopener">戰國簡牘詞彙</a>。</p>
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
    fields: '開放作答。可觀察他做事的態度、學習與解決問題的能力、與人合作的方式、面對挫折的反應等；重點是說出觀察的依據。',
    market: '不足以證明。六個例子是被記載下來的成功者，也有許多人在困境中沒有被看見；困境之外，還需要機會、他人的賞識與資源。',
    road: '開放作答。例如家人朋友的陪伴、師長的引導、休息的時間、學校或社會的資源與制度；提醒學生求助不是軟弱。',
    bridge: '開放作答。引導學生說具體：用了什麼方法、誰給了什麼幫助、練習了多久，前後有哪些改變。',
    study: '開放作答。可寫：找出錯在哪裡、向誰請教、下一次先做哪一件小事、怎麼檢查有沒有改善。',
    city: '開放作答。例如：休息是為了走更遠的路；安定時仍定期檢討、聽取不同意見、預先準備，而不是時時焦慮。'
  };
  const word = {
    '舜發於畎畝之中': '舜從田野之中被發掘、起用。（畎畝，讀ㄑㄩㄢˇ ㄇㄨˇ，田間；發，起用）',
    '傅說舉於版築之間': '傅說從築牆的工作中被選拔任用。（說，讀ㄩㄝˋ；舉，選拔任用）',
    '管夷吾舉於士': '管仲從獄官手中被釋放並任用。（士，獄官）',
    '天將降大任於是人也': '上天將要把重大的責任交給這個人。（是人，這個人；另有「斯人」版本）',
    '苦其心志，勞其筋骨': '使他的內心痛苦，使他的身體勞累。（苦、勞都當動詞，「使……」）',
    '行拂亂其所為': '使他做的事情總是不順、被打亂。（拂，讀ㄈㄨˊ，違背）',
    '動心忍性': '使內心受到震動而警覺，使性情變得堅忍。',
    '曾益其所不能': '增加他原本做不到的能力。（曾，讀ㄗㄥ，通「增」）',
    '困於心，衡於慮，而後作': '內心困苦、思慮阻塞，然後才能奮起。（衡，通「橫」，阻塞；作，奮起）',
    '徵於色，發於聲，而後喻': '表現在臉色上、抒發在言語中，然後才被人了解。（徵，表現；喻，了解）',
    '入則無法家拂士': '在國內沒有守法度的大臣和輔佐的賢士。（拂，讀ㄅㄧˋ，通「弼」）',
    '生於憂患，而死於安樂也': '憂慮禍患使人生存發展，安逸享樂使人走向滅亡。'
  };
  return `<h2>參考答案（教師版）</h2>
<h3>一、每站想一想</h3><table><tr><th>站</th><th>參考方向</th></tr>${D.planets.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(think[p.id] || '')}</td></tr>`).join('')}</table>
<h3>二、原文字詞</h3><table><tr><th>原文</th><th>參考解釋</th></tr>${words.map(w => `<tr><td>${esc(w)}</td><td>${esc(word[w] || '')}</td></tr>`).join('')}</table>
<h3>三、六個人的起點</h3><table><tr><th>人物</th><th>原本的處境</th><th>後來被誰任用</th></tr>${D.adults.map(a => `<tr><td>${esc(a.who)}</td><td>${esc(a.cares)}</td><td>${esc(a.prince)}</td></tr>`).join('')}</table>`;
}
// 朗讀清單不存在時放一份空的，前端才不會請求到 404（tools/gen-voice.mjs 會覆寫）
const mf = path.join(root, 'public/voice/manifest.json');
if (!fs.existsSync(mf)) { fs.mkdirSync(path.dirname(mf), { recursive: true }); fs.writeFileSync(mf, '{"voice":null,"files":{}}\n'); }
console.log('built public/guide.html、public/teacher.html');
