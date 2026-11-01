// ================= UI（D 線）：故事卡（原文＋白話）、元素小卡、路線列、過場字幕、旅程結尾 =================
const UI_KIND = { character: '角色', building: '建築', scene: '場景' };
const UI_LS = 'als-v1';
// 站間移動＝騎青蛙在荷葉間跳躍（C 線），前往下一站的按鈕一律「騎蛙跳往〇〇」
const UI_HOME_MS = 15000; // 等 C 線 home 事件的上限
// 手機版型：直向 ≤900px（含 iPad 直向）或橫向矮螢幕觸控
const UI_LAND = '(max-height: 500px) and (pointer: coarse)';
const UI_MQ = '(max-width: 900px), ' + UI_LAND;
const UI_WALK_MS = 4000; // 等 C 線 walked 事件的上限
// mode：gu 古文／bai 白話；quiz：各站測驗最佳分數（≥ DATA.quizPass 才算過站）；name：證書姓名
function uiLoad() {
  let v = {}; try { v = JSON.parse(localStorage.getItem(UI_LS) || '{}') || {}; } catch (e) {}
  return { visited: Array.isArray(v.visited) ? v.visited : [], auto: !!v.auto, mode: v.mode === 'gu' ? 'gu' : 'bai',
    quiz: v.quiz && typeof v.quiz === 'object' ? v.quiz : {}, name: typeof v.name === 'string' ? v.name : '' };
}
const UI_CERT_FONT = '"BiauKai","TW-Kai","Kaiti TC","STKaiti","DFKai-SB","Noto Serif TC","Songti TC",serif';
function uiShuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function uiSave(st) { try { localStorage.setItem(UI_LS, JSON.stringify(st)); } catch (e) {} }
// gloss 拆兩份：出現在原文的字詞只在原文區塊可點（避免「要」「延」這類單字在白話裡到處被標）
function uiGloss(p) {
  const y = {}, b = {};
  Object.entries(p.gloss || {}).forEach(([k, v]) => { (p.yuan && p.yuan.includes(k) ? y : b)[k] = v; });
  return { y, b };
}

function initUI(ctx) {
  const $ = id => document.getElementById(id);
  const P = DATA.planets, st = uiLoad();
  const S = { pid: null, i: 0, sheet: 'open', voice: {}, wait: null, cover: !QS.has('planet') && QS.get('auto') !== '1' };
  const done = id => st.visited.includes(id);
  const card = $('ui-card'), audio = $('ui-audio'), mq = matchMedia(UI_MQ), mqLand = matchMedia(UI_LAND), ui = $('ui');
  S.yuan = !mq.matches; // 原文區塊：桌機預設展開、手機預設收合成一行
  $('ui-works').href = DATA.author.works;

  // 朗讀檔清單：tools/gen-voice.mjs 產生；沒有或為空就不顯示朗讀鈕（先讀清單，避免請求不存在的 mp3）
  fetch('voice/manifest.json').then(r => r.ok ? r.json() : {}).then(m => { S.voice = (m && m.files) || {}; uiVoiceBtn(); }).catch(() => {});

  // ---------- 路線 ----------
  const list = $('ui-route-list');
  P.forEach(p => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.className = 'ui-stop'; b.dataset.id = p.id;
    b.innerHTML = `<span class="n">${p.num}</span><span class="t"></span><span class="c" aria-hidden="true" data-n="${P.indexOf(p) + 1}"></span>`;
    b.querySelector('.t').textContent = p.name;
    b.style.setProperty('--x', Math.round(Math.sin(Math.PI * P.indexOf(p) / (P.length - 1)) * 34) + 'px'); // 八站排成一道弧
    b.onclick = () => { if (done(p.id) && !ctx.flying && p.id !== S.pid) { if (mq.matches) uiRouteOpen(false); ctx.goPlanet(p.id); } };
    li.appendChild(b); list.appendChild(li);
  });
  function uiRoute() {
    list.querySelectorAll('.ui-stop').forEach(b => {
      const id = b.dataset.id, v = done(id), here = id === S.pid, name = P.find(p => p.id === id).name;
      b.classList.toggle('is-visited', v); b.classList.toggle('is-here', here);
      b.disabled = !v || here;
      b.setAttribute('aria-label', name + (here ? '（目前位置）' : v ? '（已拜訪，點一下前往）' : '（尚未拜訪）'));
    });
    $('ui-mini').innerHTML = P.map(p => `<i class="${p.id === S.pid ? 'here' : done(p.id) ? 'on' : ''}"></i>`).join('');
    uiPath();
  }
  // 墨線路線：用 Catmull-Rom 曲線把八個站點串起來，兩端都拜訪過的那段描成朱砂，朱印標在目前站
  function uiPath() {
    const svg = $('ui-path-svg'), box = svg.parentNode.getBoundingClientRect(); if (!box.height) return;
    const pts = [...list.querySelectorAll('.ui-stop .c')].map(c => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]; });
    const at = i => pts[clamp(i, 0, pts.length - 1)], f = n => n.toFixed(1);
    let d = '', gold = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b, c, e] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
      const seg = `M${f(b[0])} ${f(b[1])}C${f(b[0] + (c[0] - a[0]) / 6)} ${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)} ${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])} ${f(c[1])}`;
      d += seg; if (done(P[i].id) && done(P[i + 1].id)) gold += seg;
    }
    svg.innerHTML = `<path class="all" d="${d}"/><path class="gold" d="${gold}"/>`;
    const hi = P.findIndex(p => p.id === S.pid), seal = $('ui-path-seal');
    seal.hidden = hi < 0; if (hi >= 0) seal.style.transform = `translate(${f(pts[hi][0] + 14)}px,${f(pts[hi][1] - 22)}px)`;
  }
  const routeBtn = $('ui-route-btn');
  function uiRouteOpen(open) { if (open) uiElClose(); $('ui-route').hidden = !open; routeBtn.setAttribute('aria-expanded', String(open)); uiPath(); uiInsets(); }
  routeBtn.onclick = () => uiRouteOpen($('ui-route').hidden);
  $('ui-route-x').onclick = () => { uiRouteOpen(false); routeBtn.focus(); };
  // 總覽（全景）：先收起故事卡、元素卡，viewInsets 只剩頂列，C 線 overviewView 依此取景；回到任一站 arrive 會再展開
  function uiOverview() { if (typeof ctx.overview !== 'function') return; uiElClose(); uiCollapse(true); ctx.overview(); }
  $('ui-overview').onclick = uiOverview;
  ctx.on('ready', () => { if (new URLSearchParams(location.search).get('view') === 'overview') { uiElClose(); uiCollapse(true); } });

  // ---------- 故事卡 ----------
  const planet = () => P.find(p => p.id === S.pid);
  const isGu = () => st.mode === 'gu';
  const vkey = () => isGu() ? `${S.pid}-y` : `${S.pid}-${S.i + 1}`; // 朗讀檔：古文模式念原文 <pid>-y.mp3
  const nextOf = p => P[P.indexOf(p) + 1];
  function uiRender() {
    const p = planet(); if (!p) return;
    const n = p.story.length, g = uiGloss(p); S.i = clamp(S.i, 0, n - 1);
    const gu = isGu(), last = S.i === n - 1, end = gu || last, nx = nextOf(p);
    $('ui-num').textContent = gu ? `第 ${p.num} 站・原文` : `第 ${p.num} 站・第 ${S.i + 1}／${n} 段`;
    $('ui-name').textContent = p.name; $('ui-sub').textContent = p.sub;
    $('ui-handle-txt').textContent = p.name;
    $('ui-handle').setAttribute('aria-label', `${p.name}・故事卡（${gu ? '原文' : `第 ${S.i + 1}／${n} 段`}）`);
    // 古文模式：主文換成整站原文（可點註解、朗讀原文），不分段；白話模式維持原文區塊＋分段白話故事
    uiTerms($('ui-yuan-txt'), p.yuan, g.y, '原文註解'); uiYuan(S.yuan); $('ui-yuan').hidden = gu;
    $('ui-yuan-peek').textContent = p.yuan;
    $('ui-bai').textContent = gu ? '原文' : '白話故事'; $('ui-para').classList.toggle('is-gu', gu);
    if (gu) uiTerms($('ui-para'), p.yuan, g.y, '原文註解'); else uiTerms($('ui-para'), p.story[S.i], g.b);
    $('ui-think').hidden = !end || !p.think; $('ui-think-q').textContent = p.think || '';
    $('ui-dots').innerHTML = gu ? '' : p.story.map((_, k) => `<i class="${k === S.i ? 'on' : ''}"></i>`).join('');
    $('ui-prev').hidden = $('ui-next').hidden = gu;
    $('ui-prev').disabled = S.i === 0; $('ui-next').disabled = last;
    const best = st.quiz[p.id], qg = $('ui-quiz-go'); qg.hidden = !end || !quizOf(p.id).length;
    qg.textContent = best == null ? `做本站測驗（${quizOf(p.id).length} 題）` : `本站測驗 ${best}／${quizOf(p.id).length}・` + (passed(p.id) ? '已過關，再考一次' : '未過關，再考一次');
    const go = $('ui-go'); go.hidden = !end;
    go.textContent = nx ? '騎蛙跳往' + nx.name : '回到濂溪書堂，結束旅程';
    uiVoiceBtn();
  }
  // 只更新朗讀鈕（朗讀清單晚到時用，不整張重畫）
  function uiVoiceBtn() {
    if (!planet()) return;
    const has = !!S.voice[vkey()];
    $('ui-play').hidden = !has; $('ui-auto-wrap').hidden = !has || isGu(); $('ui-auto').checked = st.auto;
    if (!has) uiStop();
    uiInsets();
  }
  // 原文區塊收合：收起時只露一行「原文：水陸草木之花……」
  function uiYuan(open) {
    S.yuan = open; $('ui-yuan').classList.toggle('is-open', open);
    $('ui-yuan-btn').setAttribute('aria-expanded', String(open)); $('ui-yuan-txt').hidden = !open;
  }
  $('ui-yuan-btn').onclick = () => { uiYuan(!S.yuan); uiInsets(); };
  // 註解：文字裡出現 gloss 的詞包成按鈕，點了用元素小卡顯示註解
  function uiTerms(box, text, gloss, kind = '生詞註解') {
    box.textContent = '';
    const keys = Object.keys(gloss || {}).sort((a, b) => b.length - a.length);
    const parts = keys.length ? text.split(new RegExp('(' + keys.join('|') + ')')) : [text], seen = new Set();
    parts.forEach((t, i) => {
      if (!t) return;
      if (!keys.includes(t)) return box.appendChild(document.createTextNode(t));
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ui-term'; b.textContent = t;
      if (seen.has(t)) b.tabIndex = -1; seen.add(t); // 同一詞重複出現（唧唧復唧唧）只給第一個 Tab 焦點，滑鼠／觸控仍可點
      b.setAttribute('aria-label', t + '（' + kind + '）');
      b.onclick = () => uiNote(kind, t, gloss[t]);
      // 按鈕後緊接的標點黏在一起，避免「。」被擠到下一行開頭
      const m = /^[，。、；：！？」』）……]+/.exec(parts[i + 1] || '');
      if (!m) return box.appendChild(b);
      const w = document.createElement('span'); w.className = 'ui-nb'; w.append(b, m[0]); box.appendChild(w);
      parts[i + 1] = parts[i + 1].slice(m[0].length);
    });
  }
  // 故事鏡頭：換段時特寫該段的元素；null＝回到站點全景（約定 ctx.focusEl(id, null)）
  function uiShot(skipNull) {
    const p = planet(); if (!p || ctx.flying || S.cover || typeof ctx.focusEl !== 'function') return;
    const el = isGu() ? null : (p.shots || [])[S.i] || null;
    if (el || !skipNull) ctx.focusEl(p.id, el);
  }
  function uiStep(d) {
    const p = planet(); if (!p || isGu()) return false;
    const i = clamp(S.i + d, 0, p.story.length - 1); if (i === S.i) return false;
    const playing = !audio.paused || !!S.wait; S.i = i; uiStop(); uiRender(); uiShot(false);
    $('ui-sr').textContent = `第 ${i + 1}／${p.story.length} 段`; // 讀屏只報段號，內文自己往下讀
    $('ui-card-body').scrollTop = 0;
    if (playing) uiPlayAfterWalk();
    return true;
  }
  // 朗讀鈕名稱固定「朗讀」，只換圖示與 aria-pressed
  const uiPressed = on => { $('ui-play').setAttribute('aria-pressed', String(on)); $('ui-play-ic').textContent = on ? '❚❚' : '▶'; };
  function uiStop() { audio.pause(); if (S.wait) { clearTimeout(S.wait.t); S.wait = null; } uiPressed(false); }
  function uiPlay() {
    const k = vkey(); if (!S.voice[k]) return;
    audio.src = `voice/${k}.mp3`;
    audio.play().then(() => uiPressed(true)).catch(() => uiStop());
  }
  // 換段後若鏡頭要特寫元素，等周敦頤走到旁邊（C 線 emit('walked', {planet, el})）再念；最多等 UI_WALK_MS
  function uiPlayAfterWalk() {
    const p = planet(), el = p && !isGu() && (p.shots || [])[S.i];
    if (!el || ctx.reduced) return uiPlay();
    const go = () => { if (S.wait) { clearTimeout(S.wait.t); S.wait = null; uiPlay(); } };
    S.wait = { pid: p.id, el, go, t: setTimeout(go, UI_WALK_MS) }; uiPressed(true);
  }
  ctx.on('walked', e => { if (S.wait && e && e.planet === S.wait.pid && e.el === S.wait.el) S.wait.go(); });
  audio.onended = () => { uiStop(); if (st.auto && uiStep(1)) uiPlayAfterWalk(); };
  audio.onerror = () => uiStop();
  $('ui-play').onclick = () => (audio.paused && !S.wait) ? uiPlay() : uiStop();
  $('ui-auto').onchange = e => { st.auto = e.target.checked; uiSave(st); };
  $('ui-prev').onclick = () => uiStep(-1);
  $('ui-next').onclick = () => uiStep(1);
  $('ui-go').onclick = () => {
    const p = planet(), nx = p && nextOf(p); if (!p) return;
    if (nx) ctx.goPlanet(nx.id); else uiGoHome();
  };
  // 結尾：C 線的 ctx.goHome()（鏡頭拉遠看整卷、卷末蓋朱印，完成 emit('home')）；沒有這個函式就直接開結尾卡
  function uiGoHome() {
    if (typeof ctx.goHome !== 'function') return uiEndOpen();
    if (ctx.flying || S.home) return;
    const p = planet(); uiStop(); uiElClose(); uiCollapse(true);
    $('ui-cap-txt').textContent = (p && p.next) || '青蛙載著我，一葉一葉跳回濂溪書堂……'; $('ui-caption').hidden = false;
    S.home = setTimeout(uiHomed, UI_HOME_MS);
    try { ctx.goHome(); } catch (e) { console.error(e); uiHomed(); }
  }
  function uiHomed() { if (!S.home) return; clearTimeout(S.home); S.home = null; uiEndOpen(); }
  ctx.on('home', uiHomed);
  function uiEndOpen() { if ($('ui-end').hidden) S.endFrom = document.activeElement; uiQuizOpen(false); if (!$('ui-route').hidden) uiRouteOpen(false); uiCert(); uiCertPreview(); $('ui-caption').hidden = true; uiCollapse(true); $('ui-end').hidden = false; $('ui-end').scrollTop = 0; uiModal(); $('ui-restart').focus({ preventScroll: true }); }
  // 測驗／結尾是對話框：開著時背景（工具列、故事卡、路線、元素卡、3D）設 inert，Tab 不會跑出去
  function uiModal() {
    const on = !$('ui-quiz').hidden || !$('ui-end').hidden;
    ['.ui-top', '#ui-card', '#ui-route', '#ui-el', '#ui-caption', '#app'].forEach(q => { const e = document.querySelector(q); if (e) e.inert = on; });
  }
  $('ui-adults').innerHTML = DATA.adults.map(() => '<tr><th scope="row"></th><td data-h="象徵哪種人"></td><td data-h="誰愛它・作者的感嘆"></td></tr>').join(''); // data-h：手機堆疊時當欄名
  $('ui-adults').querySelectorAll('tr').forEach((tr, k) => { const a = DATA.adults[k]; [a.who, a.cares, a.prince].forEach((t, j) => { tr.children[j].textContent = t; }); });
  function uiEndClose() {
    $('ui-end').hidden = true; uiModal(); if (!card.hidden) uiCollapse(false);
    // 焦點回到開啟它的元素；看不見就退到「騎蛙跳往」或「證書」鈕
    const seen = e => e && e.isConnected && !e.closest('[inert]') && e.getClientRects().length > 0;
    const f = [S.endFrom, $('ui-go'), $('ui-cert-btn')].find(seen); if (f) f.focus({ preventScroll: true });
  }
  // 故事卡三態：closed（只剩把手）／peek（手機直向半收合：標題＋第一句＋按鈕）／open；peek 只在直向底部抽屜用
  const sheet = () => mq.matches && !mqLand.matches;
  const SHEET = ['closed', 'peek', 'open'];
  function uiSheet(s) {
    if (s === 'peek' && !sheet()) s = 'open';
    S.sheet = s; card.classList.toggle('is-collapsed', s === 'closed'); card.classList.toggle('is-peek', s === 'peek');
    $('ui-handle').setAttribute('aria-expanded', String(s === 'open')); uiInsets();
  }
  function uiCollapse(c) { uiSheet(c ? 'closed' : 'peek'); }
  function uiSheetStep(d) { const k = clamp(SHEET.indexOf(S.sheet) + d, 0, 2); uiSheet(SHEET[k === 1 && !sheet() ? k + d : k] || S.sheet); }
  $('ui-handle').onclick = () => uiSheet(S.sheet === 'open' ? (sheet() ? 'peek' : 'closed') : 'open');
  $('ui-handle').onkeydown = e => { const d = { ArrowUp: 1, ArrowDown: -1 }[e.key]; if (d) { uiSheetStep(d); e.preventDefault(); e.stopPropagation(); } };
  // 手機直向：往上滑展開、往下滑收回（內文捲到頂才收）
  card.addEventListener('touchstart', e => { const t = e.touches[0]; S.touch = { x: t.clientX, y: t.clientY, top: $('ui-card-body').scrollTop }; }, { passive: true });
  card.addEventListener('touchend', e => {
    const a = S.touch, t = e.changedTouches[0]; S.touch = null; if (!a || !t || !sheet()) return;
    const dy = t.clientY - a.y; if (Math.abs(dy) < 40 || Math.abs(dy) < Math.abs(t.clientX - a.x)) return;
    if (dy < 0) uiSheetStep(1); else if (a.top <= 0) uiSheetStep(-1);
  });

  // ---------- 元素 ----------
  function uiEl(pid, eid) {
    const p = P.find(x => x.id === pid), e = p && p.elements.find(x => x.id === eid); if (!e) return;
    uiNote((UI_KIND[e.kind] || '') + '・' + p.name, e.name, e.desc, uiGloss(p).b);
    $('ui-el').dataset.el = eid;
    $('ui-els').querySelectorAll('.ui-chip').forEach(c => c.classList.toggle('on', c.dataset.el === eid && pid === S.pid));
  }
  function uiNote(kind, name, desc, gloss) {
    $('ui-el-kind').textContent = kind; $('ui-el-name').textContent = name;
    uiTerms($('ui-el-desc'), desc, gloss); $('ui-el').hidden = false; $('ui-el').dataset.el = ''; uiInsets();
  }
  function uiElClose() { $('ui-el').hidden = true; uiInsets(); $('ui-els').querySelectorAll('.ui-chip').forEach(c => c.classList.remove('on')); }
  $('ui-el-x').onclick = uiElClose;
  function uiChips(p) {
    const box = $('ui-els'); box.innerHTML = '';
    p.elements.forEach(e => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ui-chip'; b.dataset.el = e.id;
      b.innerHTML = `<small>${UI_KIND[e.kind] || ''}</small><span></span>`; b.querySelector('span').textContent = e.name;
      b.onclick = () => { if (typeof ctx.focusEl === 'function') ctx.focusEl(p.id, e.id); uiEl(p.id, e.id); };
      box.appendChild(b);
    });
  }

  // ---------- 事件 ----------
  function uiArrive(id) {
    const p = P.find(x => x.id === id); if (!p) return;
    S.pid = id; S.i = 0; uiStop(); uiElClose(); uiQuizOpen(false);
    $('ui-caption').hidden = true; $('ui-end').hidden = true;
    if (!st.visited.includes(id)) { st.visited.push(id); uiSave(st); }
    uiChips(p); card.hidden = false; uiCollapse(false); uiRender(); uiRoute(); uiShot(true);
    // 鍵盤／讀屏：到站後焦點移到站名（封面時不搶焦點）
    const a = document.activeElement;
    if (!S.cover && (!a || a === document.body || ui.contains(a))) $('ui-name').focus({ preventScroll: true });
  }
  ctx.on('arrive', e => uiArrive(e && e.id));
  ctx.on('pick', e => e && uiEl(e.planet, e.el));
  ctx.on('flight', e => {
    const cap = $('ui-caption');
    if (!cap.hidden) return;
    uiStop(); uiElClose(); uiQuizOpen(false); uiCollapse(true);
    const from = P.find(p => p.id === (e && e.from));
    $('ui-cap-txt').textContent = (from && from.next) || '青蛙一蹬腿，往下一片荷葉跳去……'; cap.hidden = false;
  });
  // 略過路程：C 線若提供 ctx.skipFlight 就用；否則送 Esc（scene 已監聽 Esc 略過）
  $('ui-skip').onclick = () => { if (typeof ctx.skipFlight === 'function') ctx.skipFlight(); else dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); };
  // 再從第一站出發：goHome 之後可能已經在第一站，就直接重開故事卡
  $('ui-restart').onclick = () => { $('ui-end').hidden = true; if (ctx.current === P[0].id && !ctx.flying) uiArrive(P[0].id); else ctx.goPlanet(P[0].id); };
  $('ui-end-x').onclick = uiEndClose;
  $('ui-end-close').onclick = uiEndClose;

  // 鍵盤：←→ 換段、Esc 依序關閉結尾／元素卡／收起故事卡
  addEventListener('keydown', e => {
    const tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) && e.key !== 'Escape') return;
    if (S.cover || (!$('ui-quiz').hidden && e.key !== 'Escape')) return;
    if (e.key === 'ArrowRight' && !card.hidden) { uiStep(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' && !card.hidden) { uiStep(-1); e.preventDefault(); }
    else if (e.key === 'Escape') {
      if (ctx.flying) return; // 移動中 Esc 交給 scene 略過
      if (!$('ui-quiz').hidden) { uiQuizOpen(false); quizBtn.focus(); }
      else if (!$('ui-route').hidden && mq.matches) { uiRouteOpen(false); routeBtn.focus(); }
      else if (!$('ui-end').hidden) uiEndClose();
      else if (!$('ui-el').hidden) uiElClose();
      else if (!card.hidden) uiSheetStep(-1);
    }
  });

  // ---------- 繪本封面：?planet=、?auto=1 時略過 ----------
  function uiCoverSet(on) { S.cover = on; ui.classList.toggle('is-cover', on); $('ui-cover').hidden = !on; uiInsets(); if (!on) { uiPath(); uiShot(true); } }
  // 封面「出發」→ 出發前導讀卡 →「騎蛙出發」才開始
  $('ui-start').onclick = () => { $('ui-start').parentNode.hidden = true; $('ui-intro').hidden = false; $('ui-intro-h').focus({ preventScroll: true }); };
  $('ui-intro-go').onclick = () => { uiCoverSet(false); $('ui-name').focus({ preventScroll: true }); };

  // 場景取景避開 UI
  function uiInsets() {
    const v = ctx.viewInsets; v.left = v.right = v.bottom = v.top = 0;
    if (S.cover) return;
    const W = innerWidth, H = innerHeight;
    v.top = Math.round(document.querySelector('.ui-top').getBoundingClientRect().bottom);
    document.documentElement.style.setProperty('--ui-top-h', v.top + 'px'); // 手機路線面板從工具列下緣開始，不蓋按鈕
    // 依面板實際位置判斷佔掉哪一邊：寬過七成算底部抽屜／頂部，否則算左或右側欄
    const side = el => {
      if (el.hidden || !el.offsetWidth) return; // 用 offset* 量版面位置，避開進場動畫的 transform
      const r = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, right: el.offsetLeft + el.offsetWidth, bottom: el.offsetTop + el.offsetHeight };
      if (r.width > W * 0.7 || el.classList.contains('is-collapsed')) { /* 收起的把手只是一條橫帶，不佔側欄 */ if (H - r.bottom < r.top) v.bottom = Math.max(v.bottom, Math.round(H - r.top)); else v.top = Math.max(v.top, Math.round(r.bottom)); }
      else if (r.left + r.width / 2 > W / 2) v.right = Math.max(v.right, Math.round(W - r.left));
      else v.left = Math.max(v.left, Math.round(r.right));
    };
    side(card); if (!mqLand.matches) side($('ui-el')); // 橫向手機元素卡是暫時浮在左下的，不壓縮 3D
    if (!mq.matches) side($('ui-route')); // 手機路線是暫時蓋上去的，不算
  }
  addEventListener('resize', () => { if (S.sheet === 'peek' && !sheet()) uiSheet('open'); uiInsets(); uiPath(); });

  // ================= 古文／白話切換、每站五題測驗、結業證書 =================
  function uiMode(m) {
    st.mode = m; uiSave(st); uiStop();
    $('ui-mode-gu').setAttribute('aria-pressed', String(m === 'gu')); $('ui-mode-bai').setAttribute('aria-pressed', String(m !== 'gu'));
    if (S.pid) { uiRender(); uiShot(false); }
    if (!S.certVer && $('ui-cert-ver-gu')) { uiCertVer(); if (!$('ui-end').hidden) uiCertPreview(); }
  }
  $('ui-mode-gu').onclick = () => uiMode('gu');
  $('ui-mode-bai').onclick = () => uiMode('bai');

  function quizOf(id) { return (DATA.quiz || {})[id] || []; }
  const PASS = DATA.quizPass || 3, passed = id => (st.quiz[id] ?? -1) >= PASS;
  const quizN = () => P.filter(p => passed(p.id)).length, allDone = () => quizN() === P.length;
  const total = () => P.reduce((t, p) => t + (st.quiz[p.id] || 0), 0), totalN = () => P.reduce((t, p) => t + quizOf(p.id).length, 0);
  const form = $('ui-quiz-form'), quizBtn = $('ui-quiz-btn');
  function uiQuizOpen(open) {
    if (open && !S.pid) return;
    if (open) { uiStop(); uiElClose(); if (mq.matches && !$('ui-route').hidden) uiRouteOpen(false); uiQuizNew(); }
    $('ui-quiz').hidden = !open; quizBtn.setAttribute('aria-expanded', String(open)); uiModal();
    if (open) { form.scrollTop = 0; $('ui-quiz-h').focus({ preventScroll: true }); }
  }
  quizBtn.onclick = () => uiQuizOpen($('ui-quiz').hidden);
  $('ui-quiz-go').onclick = () => uiQuizOpen(true);
  $('ui-quiz-x').onclick = () => { uiQuizOpen(false); quizBtn.focus(); };
  // 題序照原文順序；選項每次洗牌（資料裡正解都放第一個）
  function uiQuizNew() {
    S.qz = { pid: S.pid, done: false, score: 0, ans: {}, items: quizOf(S.pid).map(q => ({ q, ord: uiShuffle([0, 1, 2, 3]) })) };
    uiQuizRender();
  }
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  function uiQuizRender() {
    const z = S.qz, p = planet(); form.textContent = '';
    $('ui-quiz-h').textContent = p ? `第 ${p.num} 站・${p.name}` : '';
    const best = p && st.quiz[p.id];
    $('ui-quiz-st').textContent = `讀完原文再作答，答對 ${PASS} 題以上就過關（已過關 ${quizN()}／${P.length} 站）。` + (best != null ? `最佳成績 ${best}／${z.items.length}。` : '');
    $('ui-quiz-submit').hidden = z.done; $('ui-quiz-retry').hidden = !z.done; $('ui-quiz-cert').hidden = !(z.done && allDone());
    $('ui-quiz-res').textContent = ''; $('ui-quiz-res').className = 'ui-quiz-res';
    z.items.forEach((it, k) => {
      const q = it.q, f = mk('fieldset', 'ui-q');
      const lg = mk('legend'); lg.append(mk('span', 'ui-q-n', String(k + 1)), mk('span', 'ui-q-t', q.q)); f.appendChild(lg);
      const ch = mk('div', 'ui-q-ch');
      it.ord.forEach(ci => {
        const lb = mk('label', 'ui-q-c'), r = mk('input'); r.type = 'radio'; r.name = 'uq' + k; r.value = ci;
        r.checked = z.ans[k] === ci; r.disabled = z.done;
        if (z.done) { lb.classList.toggle('is-right', ci === q.a); lb.classList.toggle('is-wrong', z.ans[k] === ci && ci !== q.a); }
        lb.append(r, mk('span', null, q.c[ci])); ch.appendChild(lb);
      });
      f.appendChild(ch);
      if (z.done) { const ok = z.ans[k] === q.a; f.classList.add(ok ? 'is-ok' : 'is-bad'); const fb = mk('p', 'ui-q-fb'); fb.append(mk('b', null, ok ? '✓ 答對了。' : '✗ 正解：' + q.c[q.a] + '。'), q.why); f.appendChild(fb); }
      form.appendChild(f);
    });
    if (z.done) {
      const r = $('ui-quiz-res'), ok = z.score >= PASS; r.className = 'ui-quiz-res ' + (ok ? 'is-ok' : 'is-bad');
      r.textContent = ok ? `答對 ${z.score}／${z.items.length} 題，本站過關！` + (allDone() ? '八站全部過關，可以領證書了。' : `已過關 ${quizN()}／${P.length} 站。`)
        : `答對 ${z.score}／${z.items.length} 題，還差 ${PASS - z.score} 題才過關。看看解析，再考一次吧（選項會重新洗牌）。`;
    } else uiQuizCount();
  }
  function uiQuizCount() {
    const z = S.qz, n = Object.keys(z.ans).length, b = $('ui-quiz-submit');
    b.disabled = n < z.items.length; b.textContent = `交卷（已答 ${n}／${z.items.length}）`;
  }
  form.addEventListener('change', e => { const t = e.target, z = S.qz; if (!z || z.done || t.type !== 'radio') return; z.ans[t.name.slice(2)] = Number(t.value); uiQuizCount(); });
  $('ui-quiz-submit').onclick = () => {
    const z = S.qz; if (!z || z.done || Object.keys(z.ans).length < z.items.length) return;
    z.done = true; z.score = z.items.filter((it, k) => z.ans[k] === it.q.a).length;
    st.quiz[z.pid] = Math.max(st.quiz[z.pid] ?? 0, z.score); uiSave(st);
    uiQuizRender(); uiRender(); uiCert();
    form.scrollTop = 0; $('ui-quiz-res').setAttribute('tabindex', '-1'); $('ui-quiz-res').focus({ preventScroll: true });
  };
  $('ui-quiz-retry').onclick = () => { uiQuizNew(); form.scrollTop = 0; $('ui-quiz-h').focus({ preventScroll: true }); };
  function uiCertOpen() { uiEndOpen(); $('ui-cert').scrollIntoView({ block: 'start' }); $('ui-cert-h').focus({ preventScroll: true }); } // 不直接聚焦姓名框，手機才不會一打開就彈鍵盤
  $('ui-quiz-cert').onclick = uiCertOpen;
  $('ui-cert-btn').onclick = uiCertOpen;

  // ---------- 證書（兩版：文言「結業狀」／白話「結業證書」；預設跟著古文｜白話模式，表單可改） ----------
  const certVer = () => S.certVer || st.mode;
  const CERT = {
    gu: { title: '結業狀', label: '文言版', hello: '茲有', fallback: '無名氏', file: 'ailianshuo-jieyezhuang.png',
      lines: ['誦讀〈愛蓮說〉，隨茂叔乘蛙，躍蓮葉、渡仙池，', '觀水陸百花，過東籬之菊、長安之牡丹，見蓮出淤泥而不染，', '八站皆通，知君子之可貴。特頒此狀，以資嘉勉。'] },
    bai: { title: '結業證書', label: '白話版', hello: '恭喜', fallback: '小小旅人', file: 'ailianshuo-certificate.png',
      lines: ['跟著周敦頤騎著大青蛙，跳完〈愛蓮說〉八片大荷葉，', '從水陸百花、東籬黃菊、長安牡丹，到出淤泥而不染的蓮；', '讀了原文，也完成每站測驗，特頒此證書。'] }
  };
  function uiCertVer() {
    const v = certVer();
    $('ui-cert-ver-gu').setAttribute('aria-pressed', String(v === 'gu')); $('ui-cert-ver-bai').setAttribute('aria-pressed', String(v !== 'gu'));
    $('ui-cert-img').alt = '你的愛蓮說蓮池蛙躍' + CERT[v].title;
  }
  function uiCert() {
    const n = quizN(), all = allDone();
    $('ui-cert-need').hidden = all; $('ui-cert-form').hidden = !all;
    $('ui-cert-need').textContent = `八站測驗都過關（每站五題，答對 ${PASS} 題以上），就能領取證書（文言版「結業狀」或白話版「結業證書」）。目前 ${n}／${P.length} 站。`;
    $('ui-cert-score').textContent = `八站總分 ${total()}／${totalN()}`;
    $('ui-cert-name').value = st.name; uiCertVer();
    $('ui-cert-btn').textContent = all ? '證書 ★' : `證書 ${n}/${P.length}`;
    $('ui-cert-btn').setAttribute('aria-label', all ? '證書：可以領取了' : `證書：已過關 ${n} 站，共 ${P.length} 站`);
  }
  const uiPickVer = v => { S.certVer = v; uiCertVer(); $('ui-cert-msg').textContent = ''; uiCertPreview(); };
  $('ui-cert-ver-gu').onclick = () => uiPickVer('gu');
  $('ui-cert-ver-bai').onclick = () => uiPickVer('bai');
  let certT = 0;
  $('ui-cert-name').oninput = e => { st.name = e.target.value.slice(0, 20); uiSave(st); clearTimeout(certT); certT = setTimeout(uiCertPreview, 600); };
  const uiImg = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
  const CN = '〇一二三四五六七八九';
  const cnNum = n => n <= 10 ? (n === 10 ? '十' : CN[n]) : n < 20 ? '十' + CN[n % 10] : CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
  const cnYear = n => String(n).split('').map(d => CN[d]).join('');
  async function uiCertCanvas(ver) {
    const W = 2480, H = 1754, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), rnd = mulberry32(1754), F = UI_CERT_FONT, T = CERT[ver], gu = ver === 'gu';
    const ink = '#2b2622', ink2 = '#5a5048', red = '#c0392b';
    const imgs = await Promise.all(['hero', ...P.map(p => p.id)].map(id => uiImg(`cert/${id}.jpg`)));
    // 宣紙：底色＋淡墨與彩墨低彩度暈染＋纖維紋＋暖褐泛黃邊
    g.fillStyle = '#f3ead6'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * W, y = rnd() * H, r = 160 + rnd() * 460, col = ['156,150,138', '192,57,43', '224,177,60', '63,110,140', '92,138,106'][i % 5];
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${(i % 5 ? 0.04 : 0.08) + rnd() * 0.05})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    g.strokeStyle = 'rgba(120,96,60,.07)'; g.lineWidth = 1.5;
    for (let i = 0; i < 1600; i++) { const x = rnd() * W, y = rnd() * H, a = rnd() * 6.28, l = 8 + rnd() * 30; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    for (let i = 0; i < 16000; i++) { g.fillStyle = `rgba(90,70,40,${rnd() * 0.06})`; g.fillRect(rnd() * W, rnd() * H, 2, 2); }
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.62); vg.addColorStop(0, 'rgba(160,98,58,0)'); vg.addColorStop(1, 'rgba(160,98,58,.2)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    // 墨框：粗墨線疊幾筆（濃淡不均像毛筆）＋朱砂細框
    g.lineJoin = 'round';
    for (let k = 0; k < 4; k++) { g.strokeStyle = `rgba(43,38,34,${0.55 - k * 0.1})`; g.lineWidth = 16 - k * 3; const j = () => (rnd() - 0.5) * 6; g.strokeRect(72 + j(), 72 + j(), W - 144 + j(), H - 144 + j()); }
    g.strokeStyle = red; g.lineWidth = 3; g.strokeRect(104, 104, W - 208, H - 208);
    // 四角彩墨點（朱砂、藤黃、胭脂）
    const dot = (x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col.replace('A', '.75')); gr.addColorStop(0.7, col.replace('A', '.45')); gr.addColorStop(1, col.replace('A', '0')); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    [[170, 170], [W - 170, 170], [170, H - 170], [W - 170, H - 170]].forEach(([x, y], i) => {
      ['rgba(192,57,43,A)', 'rgba(224,177,60,A)', 'rgba(181,71,107,A)'].forEach((col, k) => dot(x + (x < W / 2 ? 1 : -1) * k * 46 + (rnd() - 0.5) * 16, y + (y < H / 2 ? 1 : -1) * (k % 2) * 30, 20 + rnd() * 14 - k * 3, col));
    });
    // 標題
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = ink;
    const sp = gu ? 90 : 40;
    g.font = `700 150px ${F}`; if ('letterSpacing' in g) g.letterSpacing = sp + 'px'; g.fillText(T.title, W / 2 + sp / 2, 300); if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.font = `600 52px ${F}`; g.fillStyle = red; g.fillText('〈愛蓮說〉蓮池蛙躍', W / 2, 382);
    const fit = (txt, size, maxW, style = '') => { let s = size; do { g.font = `${style} ${s}px ${F}`; s -= 2; } while (g.measureText(txt).width > maxW && s > 20); };
    const photo = (im, x, y, r, color) => {
      g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.closePath(); g.fillStyle = color; g.fill(); g.clip();
      if (im) { const s = Math.max(2 * r / im.width, 2 * r / im.height); g.drawImage(im, x - im.width * s / 2, y - im.height * s / 2, im.width * s, im.height * s); }
      g.restore();
      g.strokeStyle = ink; g.lineWidth = 7; g.beginPath(); g.arc(x, y, r + 5, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(192,57,43,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r + 20, 0, Math.PI * 2); g.stroke();
    };
    // 左：周敦頤大圓照
    photo(imgs[0], 560, 880, 320, '#a0623a');
    g.fillStyle = ink; g.font = `600 58px ${F}`; g.fillText('周敦頤', 560, 1294);
    const tt = total(), tn = totalN();
    g.fillStyle = red; g.font = `700 50px ${F}`; g.fillText(gu ? `總分　${cnNum(tn)}題中${cnNum(tt)}` : `總分 ${tt}／${tn}`, 560, 1384);
    // 右：名字、內文、八站成績（四個一排）
    const cx = 1640, name = (st.name || '').trim() || T.fallback;
    g.fillStyle = ink2; g.font = `48px ${F}`; g.fillText(T.hello, cx, 492);
    g.fillStyle = ink; fit(name, 128, 1200, '700'); g.fillText(name, cx, 628);
    g.strokeStyle = 'rgba(43,38,34,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 600, 664); g.lineTo(cx + 600, 664); g.stroke();
    g.fillStyle = ink; T.lines.forEach((t, i) => { fit(t, 44, 1260); g.fillText(t, cx, 734 + i * 58); });
    P.forEach((p, i) => {
      const x = cx + (i % 4 - 1.5) * 310, y = i < 4 ? 975 : 1290, best = st.quiz[p.id], n = quizOf(p.id).length;
      photo(imgs[i + 1], x, y, 80, p.color);
      g.fillStyle = ink; fit(p.name, 38, 280, '600'); g.fillText(p.name, x, y + 138);
      g.fillStyle = red; g.font = `600 32px ${F}`;
      g.fillText(best == null ? '—' : gu ? `${cnNum(n)}題中${cnNum(best)}` : `${best}／${n}`, x, y + 176);
    });
    // 頁尾：日期（文言版用民國中文數字）、製作
    g.strokeStyle = 'rgba(43,38,34,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(200, 1530); g.lineTo(W - 200, 1530); g.stroke();
    const d = new Date(), date = gu ? `中華民國${cnYear(d.getFullYear() - 1911)}年${cnNum(d.getMonth() + 1)}月${cnNum(d.getDate())}日` : `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
    g.fillStyle = ink2; g.font = `40px ${F}`;
    g.textAlign = 'left'; g.fillText(date, 300, 1600);
    g.textAlign = 'right'; g.fillText((gu ? '製者　' : '製作：') + DATA.author.name, W - 300, 1600);
    // 朱印「君子」
    g.save(); g.translate(W / 2, 1590); g.rotate(-0.05); g.fillStyle = 'rgba(192,57,43,.9)'; g.fillRect(-64, -64, 128, 128);
    g.strokeStyle = '#f3ead6'; g.lineWidth = 4; g.strokeRect(-54, -54, 108, 108);
    g.fillStyle = '#f3ead6'; g.textAlign = 'center'; g.font = `700 50px ${F}`; g.fillText('君', 0, -6); g.fillText('子', 0, 46); g.restore();
    return c;
  }
  // 證書 PNG 依「版本＋名字（＋成績）」快取：打開就先畫好，按鈕一按就能叫出分享面板（Safari 的使用者手勢有時效）
  const certCache = new Map();
  async function uiCertBlob(ver = certVer()) {
    const key = ver + '|' + st.name + '|' + JSON.stringify(st.quiz);
    if (!certCache.has(key)) certCache.set(key, uiCertCanvas(ver).then(c => new Promise(r => c.toBlob(r, 'image/png'))));
    return certCache.get(key);
  }
  const touch = matchMedia('(pointer: coarse)');
  // 證書圖直接顯示在表單裡：分享／下載失敗時，長按圖片也能存
  async function uiCertPreview() {
    if (!allDone()) return;
    try {
      const ver = certVer(), b = await uiCertBlob(ver), im = $('ui-cert-img'); if (ver !== certVer()) return; // 畫的途中換了版本
      if (im.src) URL.revokeObjectURL(im.src); im.src = URL.createObjectURL(b); im.hidden = false; im.dataset.ver = ver; $('ui-cert-tip').hidden = !touch.matches;
    } catch (e) { console.error(e); }
  }
  // 平板／手機走分享面板（「儲存影像」進相簿）；電腦或不支援就下載檔案
  $('ui-cert-dl').onclick = async () => {
    const btn = $('ui-cert-dl'), msg = $('ui-cert-msg'), ver = certVer(), fn = CERT[ver].file; if (btn.disabled) return;
    btn.disabled = true; msg.textContent = CERT[ver].title + '繪製中…';
    try {
      const b = await uiCertBlob(ver), f = new File([b], fn, { type: 'image/png' }); uiCertPreview();
      if (touch.matches && navigator.canShare && navigator.canShare({ files: [f] })) {
        try { await navigator.share({ files: [f] }); msg.textContent = '完成！選「儲存影像」就會存進相簿。'; }
        catch (e) { msg.textContent = e.name === 'AbortError' ? '' : '再按一次「儲存證書」，或長按下面的證書圖存下來。'; }
      } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = fn; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000); msg.textContent = '已下載：' + fn;
      }
    } catch (e) { console.error(e); msg.textContent = '抱歉，證書畫不出來。'; }
    btn.disabled = false;
  };
  // 列印版：把證書圖放進只在列印時顯示的 #ui-print（A4 橫式）
  $('ui-cert-print').onclick = async () => {
    const btn = $('ui-cert-print'); if (btn.disabled) return; btn.disabled = true;
    try {
      const ver = certVer(), b = await uiCertBlob(ver), pr = $('ui-print'), im = new Image(); im.alt = '愛蓮說蓮池蛙躍' + CERT[ver].title;
      await new Promise(r => { im.onload = r; im.src = URL.createObjectURL(b); }); pr.textContent = ''; pr.appendChild(im); print();
    } catch (e) { console.error(e); $('ui-cert-msg').textContent = '抱歉，證書畫不出來。'; }
    btn.disabled = false;
  };
  uiMode(st.mode); uiCert();

  uiRouteOpen(!mq.matches);
  if (ctx.current) uiArrive(ctx.current); else uiRoute();
  uiCoverSet(S.cover);
  if (S.cover) $('ui-start').focus();
}
