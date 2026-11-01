// node build.mjs [out=public/index.html]：把各線檔案串成單一 HTML
import fs from 'fs';
const out = (process.argv.find(a => a.startsWith('out=')) || 'out=public/index.html').slice(4);
const rd = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
const css = rd('src/base.css') + '\n' + rd('parts/ui.css');
const html = rd('parts/ui.html') || '<div id="loader"><div>桃花源記・漁人之旅</div><div id="loader-msg">載入中…</div></div><div id="app"></div>';
const js = [rd('src/core.js'), rd('src/data.js'), rd('parts/chibi.js'), rd('parts/planets-a.js'), rd('parts/planets-b.js'), rd('parts/scene.js'), rd('parts/ui.js'), rd('src/boot.js')].join('\n');
const s = rd('src/shell.html').replace('/*@@CSS@@*/', () => css).replace('<!--@@HTML@@-->', () => html).replace('//@@JS@@', () => js);
fs.mkdirSync(out.replace(/\/[^/]*$/, '') || '.', { recursive: true });
fs.writeFileSync(out, s);
console.log('built', out, (s.length / 1024).toFixed(0) + 'KB');
