import {cp, mkdir, rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true}); await mkdir('dist/vendor/three',{recursive:true});
for(const name of ['index.html','guide.html','teacher.html','style.css','src','public']) await cp(name,name==='public'?'dist':`dist/${name}`,{recursive:true});
await cp('node_modules/three/build','dist/vendor/three/build',{recursive:true});
await cp('node_modules/three/examples/jsm','dist/vendor/three/examples/jsm',{recursive:true});
await cp('node_modules/three/LICENSE','dist/vendor/three/LICENSE');
console.log('已建立 dist');
