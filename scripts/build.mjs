import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
execFileSync(process.execPath, ['build.mjs', 'out=public/index.html'], { stdio: 'inherit' });
const vendor = 'public/vendor/three';
fs.mkdirSync(vendor + '/build', { recursive: true });
fs.copyFileSync('node_modules/three/build/three.module.min.js', vendor + '/build/three.module.min.js');
const seen = new Set();
function copyModule(rel) {
  const p = path.posix.normalize(rel);
  if (seen.has(p)) return;
  seen.add(p);
  const s = fs.readFileSync('node_modules/three/' + p, 'utf8');
  fs.mkdirSync(path.dirname(vendor + '/' + p), { recursive: true });
  fs.writeFileSync(vendor + '/' + p, s);
  for (const m of s.matchAll(/from\s+['"]([^'"]+)['"]/g)) if (m[1].startsWith('.')) copyModule(path.posix.join(path.posix.dirname(p), m[1]));
}
['controls/OrbitControls.js', 'renderers/CSS2DRenderer.js', 'utils/BufferGeometryUtils.js', 'math/SimplexNoise.js', 'loaders/GLTFLoader.js', 'libs/meshopt_decoder.module.js'].forEach(p => copyModule('examples/jsm/' + p));
// 第四輪：models/index.json 列出現有 GLB（P.glb 只抓清單上的，缺檔不會 404）；public/models、public/pano 隨 public 一起出到 dist
fs.mkdirSync('public/models', { recursive: true });
fs.writeFileSync('public/models/index.json', JSON.stringify(fs.readdirSync('public/models').filter(f => f.endsWith('.glb')).map(f => f.slice(0, -4)).sort()));
fs.copyFileSync('node_modules/three/LICENSE', vendor + '/LICENSE');
// D 線可在 scripts/guide.mjs 產生 public/guide.html
if (fs.existsSync('scripts/guide.mjs')) execFileSync(process.execPath, ['scripts/guide.mjs'], { stdio: 'inherit' });
fs.mkdirSync('dist', { recursive: true });
fs.cpSync('public', 'dist', { recursive: true });
console.log('完成：public/ 與 dist/');
