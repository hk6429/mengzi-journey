import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {landmarks} from './landmarks.js';
import {stations} from './data.js';
import {buildStationsA} from './stations-a.js';
import {buildStationsB} from './stations-b.js';
import {createBoat} from './boat.js';

export function createScene(container) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e2dcc6'); scene.fog = new THREE.Fog('#e2dcc6', 500, 900);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 1000); camera.position.set(9, 7, 12);
  const renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.shadowMap.enabled=true; container.append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 1, 0); controls.enablePan=false; controls.minDistance=7; controls.maxDistance=500; controls.maxPolarAngle=Math.PI*.48; controls.update();
  scene.add(new THREE.HemisphereLight('#fff4da','#485d50',2)); const sun=new THREE.DirectionalLight('#fff1d1',2); sun.position.set(5,10,6); scene.add(sun);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(145, 28), new THREE.MeshStandardMaterial({color:'#719e9c',roughness:.65}));
  water.rotation.x=-Math.PI/2; water.position.set(50,-.25,0); scene.add(water);
  const centers=Array.from({length:6},(_,i)=>new THREE.Vector3(i*20,0,0));
  const groups=[], islands=[], bridges=[],islandNames=[];
  const palette=['#71875a','#a97e58','#897d71','#927d60','#a88d67','#a08669'];
  for(let i=0;i<6;i++){
    const island=new THREE.Mesh(new THREE.CylinderGeometry(7,6.5,.65,32),new THREE.MeshStandardMaterial({color:palette[i],roughness:1}));
    island.position.set(centers[i].x,-.36,0);scene.add(island);
    // 碼頭延伸至島外河道，船隻在島嶼之間保持水面航行。
    const dock=new THREE.Mesh(new THREE.BoxGeometry(1.3,.18,2.6),new THREE.MeshStandardMaterial({color:'#8b6949'}));dock.position.set(centers[i].x,.08,6.8);scene.add(dock);islands.push({index:i,object:island,dock});
    const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=128;const labelContext=labelCanvas.getContext('2d');labelContext.fillStyle='#fff5df';labelContext.fillRect(3,3,506,122);labelContext.strokeStyle='#9b7051';labelContext.lineWidth=5;labelContext.strokeRect(4,4,504,120);labelContext.textAlign='center';labelContext.textBaseline='middle';labelContext.font='bold 45px serif';labelContext.fillStyle='#703b2d';labelContext.fillText(`${i+1} ${stations[i].name}`,256,64);const sign=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(labelCanvas),depthTest:false}));sign.position.set(centers[i].x,5,-1);sign.scale.set(9,2.25,1);sign.visible=false;scene.add(sign);islandNames.push(sign);
    if(i<5){
      const bridge=new THREE.Group();bridge.position.set(centers[i].x+10,0,3);
      const wood=new THREE.MeshStandardMaterial({color:'#795b40'});
      const deck=new THREE.Mesh(new THREE.BoxGeometry(8.4,.25,1.3),wood);deck.position.y=.55;bridge.add(deck);
      for(const x of [-4.2,4.2]){const pier=new THREE.Mesh(new THREE.BoxGeometry(.32,.85,.32),wood);pier.position.set(x,.1,0);bridge.add(pier)}
      for(const z of [-.6,.6]){const rail=new THREE.Mesh(new THREE.BoxGeometry(8.4,.12,.12),wood);rail.position.set(0,1.15,z);bridge.add(rail);for(const x of [-4,0,4]){const post=new THREE.Mesh(new THREE.BoxGeometry(.12,.6,.12),wood);post.position.set(x,.85,z);bridge.add(post)}}scene.add(bridge);bridges.push(bridge);
    }
  }
  // 遠山沿河布置，形成連續的水墨山水。
  for(let n=0;n<20;n++){
    const height=5+(n*7%6)*.8;
    const mountain=new THREE.Mesh(new THREE.ConeGeometry(5,height,5),new THREE.MeshStandardMaterial({color:n%2?'#899e91':'#a4b4a8',roughness:1,flatShading:true}));
    mountain.position.set(-15+n*7,height/2-.35,-19-(n%3)*3);scene.add(mountain);
  }
  let group; let hero; let station=0; const targetPoint=new THREE.Vector3(0,1,0); let heroDestination=new THREE.Vector3(0,0,2); let desiredDistance=null;controls.addEventListener('start',()=>{desiredDistance=null});
  const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:.9});
  const hallAsset=new Promise(resolve=>new GLTFLoader().load('./models/warring-hall.glb',g=>resolve(g.scene),undefined,()=>resolve(null)));
  const slipsAsset=new Promise(resolve=>new GLTFLoader().load('./models/bamboo-slips.glb',g=>resolve(g.scene),undefined,()=>resolve(null)));
  const earthAsset=new Promise(resolve=>new GLTFLoader().load('./models/rammed-earth.glb',g=>resolve(g.scene),undefined,()=>resolve(null)));
  function earthwork(x,z){
    const owner=group,fallback=[];
    for(let n=0;n<4;n++)fallback.push(box(x,n*.34,z,1.8,.3,.55,'#ba9771'));
    for(const offset of [-1.05,1.05])fallback.push(box(x+offset,0,z,.15,1.6,.75,'#73513d'));
    earthAsset.then(model=>{if(!model)return;const instance=model.clone(true);let bounds=new THREE.Box3().setFromObject(instance);const height=bounds.getSize(new THREE.Vector3()).y;if(!height)return;instance.scale.setScalar(2/height);bounds.setFromObject(instance);const center=bounds.getCenter(new THREE.Vector3());instance.position.set(x-center.x,-bounds.min.y,z-center.z);instance.userData.asset='rammed-earth';owner.add(instance);fallback.forEach(o=>{owner.remove(o);o.geometry.dispose();o.material.dispose()})});
  }
  function slips(x,y,z,width){
    const owner=group,fallback=[];
    for(let n=0;n<6;n++)fallback.push(box(x-width/2+n*width/6,y,z,width/7,.035,.55,'#d2bb87'));
    for(const offset of [-.18,.18])fallback.push(box(x,y+.04,z+offset,width,.025,.025,'#76543b'));
    slipsAsset.then(model=>{if(!model)return;const instance=model.clone(true);let bounds=new THREE.Box3().setFromObject(instance);const size=bounds.getSize(new THREE.Vector3());if(!size.x||!size.z)return;instance.scale.setScalar(width/Math.max(size.x,size.z));bounds.setFromObject(instance);const center=bounds.getCenter(new THREE.Vector3());instance.position.set(x-center.x,y-bounds.min.y,z-center.z);instance.userData.asset='bamboo-slips';owner.add(instance);fallback.forEach(o=>{owner.remove(o);o.geometry.dispose();o.material.dispose()})});
  }
  function box(x,y,z,w,h,d,c){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(c)); o.position.set(x,y+h/2,z); group.add(o);return o}
  function tree(x,z){const t=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,1.6,7),material('#70523b'));trunk.position.y=.8;t.add(trunk);for(let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.SphereGeometry(.6-i*.1,8,6),material(i%2?'#648469':'#526e55'));crown.position.set((i-1)*.28,1.6+i*.25,0);t.add(crown)}t.position.set(x,0,z);group.add(t)}
  function building(x,z){
    const first=group.children.length;
    box(x,0,z,2.7,1.7,1.7,'#d6c49b');box(x,1.7,z,3.2,.18,2.1,'#62483a');box(x,0,z+.88,.65,1.2,.08,'#604736');
    const roof=new THREE.Mesh(new THREE.ConeGeometry(2.35,.75,4),material('#5e5b4d'));roof.rotation.y=Math.PI/4;roof.position.set(x,2.1,z);group.add(roof);
    const owner=group;const fallback=owner.children.slice(first);const marker=new THREE.Group();owner.add(marker);
    hallAsset.then(model=>{if(!model||marker.parent!==owner)return;const instance=model.clone(true);const bounds=new THREE.Box3().setFromObject(instance);const size=bounds.getSize(new THREE.Vector3());if(!size.x||!size.y)return;instance.scale.setScalar(3.2/Math.max(size.x,size.z));bounds.setFromObject(instance);const center=bounds.getCenter(new THREE.Vector3());instance.position.set(x-center.x,-bounds.min.y,z-center.z);instance.traverse(o=>o.userData.sharedAsset=true);marker.add(instance);fallback.forEach(o=>{owner.remove(o);o.geometry?.dispose();o.material?.dispose()})});
  }
  function addLabel(item){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff5df';ctx.fillRect(4,4,504,120);ctx.strokeStyle='#a57c49';ctx.lineWidth=5;ctx.strokeRect(5,5,502,118);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#693c31';ctx.font='bold 52px serif';ctx.fillText(item.name,256,64);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false}));sprite.scale.set(2.1,.52,1);sprite.position.set(item.x,2.6,item.z);sprite.userData.landmark=item.id;group.add(sprite)}
  function person(x,z,color){const p=new THREE.Group();const robe=new THREE.Mesh(new THREE.ConeGeometry(.42,1.25,12),material(color));robe.position.y=.63;p.add(robe);const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),material('#d6ad89'));head.position.y=1.47;p.add(head);const hair=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),material('#383532'));hair.position.y=1.68;p.add(hair);p.position.set(x,0,z);group.add(p)}
  function build(i){group=new THREE.Group();group.position.copy(centers[i]);scene.add(group);groups.push(group);tree(-4,-3);tree(4,-3);tree(-5,2);
    if(i===0){for(let n=0;n<5;n++){box(-2.5+n*.55,0,0,.26,.12,4,'#72583a');for(let k=0;k<5;k++)box(-2.5+n*.55,.12,-1.7+k*.75,.12,.27,.12,'#7c9b5d')}earthwork(2.5,-2);person(-3.2,-1,'#a27d56');person(3.5,-1,'#74675d')}
    if(i===1){building(.3,-3);for(let n=0;n<3;n++){box(-3+n*1.1,0,0,.85,.7,.8,'#855d3e');box(-3+n*1.1,.7,0,1,.1,1,'#bd9270');box(-3+n*1.1,.82,0,.5,.14,.4,n===1?'#f1e7cc':'#819fa0')}box(3,0,-1,2,.04,3,'#7babb0');for(let n=0;n<4;n++)box(.1+n*.45,0,-1.5,.09,1.4,.09,'#594337');person(-3.8,-1,'#7b6a56');person(.1,-1,'#77695e')}
    if(i===2){box(2,0,-1,.7,1,.45,'#926f4c');box(2,1,-1,.8,.16,.5,'#694a32');for(let n=0;n<6;n++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.45+n*.08),material('#8c8274'));rock.position.set(-3+n*1.15,.35,-1+n*.3);group.add(rock)}}
    if(i===3){box(-.25,0,0,6,.04,2.5,'#7babb0');for(let n=0;n<6;n++)box(-2.5+n*.9,.2,0,.78,.16,1.8,'#926a45');box(2,0,-2,1.8,.8,1.2,'#785641');for(let n=0;n<5;n++)box(1.4+n*.27,.8,-2,.18,.06,.7,'#dbc392')}
    if(i===4){building(1,-2);box(-2,0,0,1.8,.7,1,'#77543b');box(-2,.7,0,1.3,.08,.7,'#dfcea4')}
    if(i===5){for(let n=0;n<5;n++)box(-3+n*1.5,0,-2,1.45,1.4,.8,'#b49d77');building(2.5,-2.6);person(1,-1,'#6f7371')}
    const helpers={group,box,person,tree,building,slips,material,THREE};buildStationsA(i,helpers);buildStationsB(i,helpers);landmarks[i].forEach(addLabel);
  }
  for(let i=0;i<6;i++)build(i);
  group=groups[0];
  const fallback=new THREE.Group();const body=new THREE.Mesh(new THREE.ConeGeometry(.55,1.6,12),material('#535e67'));body.position.y=.8;fallback.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.32,16,12),material('#d1a77f'));head.position.y=1.75;fallback.add(head);
  const walker=new THREE.Group();walker.add(fallback);scene.add(walker);walker.position.set(0,0,2);
  new GLTFLoader().load('./models/mengzi-normal.glb',g=>{hero=g.scene;const bounds=new THREE.Box3().setFromObject(hero);const size=bounds.getSize(new THREE.Vector3());if(!size.y)return;hero.scale.setScalar(2/size.y);bounds.setFromObject(hero);const center=bounds.getCenter(new THREE.Vector3());hero.position.set(-center.x,-bounds.min.y,-center.z);walker.add(hero);walker.remove(fallback)},undefined,()=>{console.warn('孟子模型載入失敗，使用備用人物。')});
  const boat=createBoat(THREE);scene.add(boat);boat.position.set(0,-.2,9);
  let journey=null; const travel={from:0,to:0,arrivals:0};
  function setStation(i){
    islandNames.forEach(label=>label.visible=false);
    if(!Number.isInteger(i)||i<0||i>=centers.length)return;
    journey=null;station=i;group=groups[i];boat.position.set(centers[i].x,-.2,9);
    walker.position.set(centers[i].x,0,2);heroDestination.copy(walker.position);
    targetPoint.set(centers[i].x,1,0);camera.position.add(targetPoint.clone().sub(controls.target));controls.target.copy(targetPoint);desiredDistance=16;
  }
  function finishTravel(){if(!journey)return;const {destination,onArrive}=journey;journey=null;setStation(destination);travel.arrivals++;onArrive?.()}
  function travelTo(i,onArrive){
    if(!Number.isInteger(i)||i<0||i>=centers.length)return;
    travel.from=station;travel.to=i;journey={destination:i,onArrive,phase:'board'};
    islandNames.forEach(label=>label.visible=false);
    targetPoint.copy(walker.position);controls.target.copy(targetPoint);camera.position.copy(targetPoint).add(new THREE.Vector3(9,7,12));desiredDistance=16;controls.update();
    heroDestination.copy(walker.position);
    if(i===station||matchMedia('(prefers-reduced-motion: reduce)').matches)finishTravel();
  }
  function overview(){islandNames.forEach(label=>label.visible=true);targetPoint.set(50,0,0);controls.target.copy(targetPoint);const distance=Math.max(170,115/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));camera.position.set(50,distance*.6,distance*.8);desiredDistance=null;controls.update()}
  function focus(id){islandNames.forEach(label=>label.visible=false);const item=landmarks[station].find(x=>x.id===id);if(id!==null&&!item)return;for(const object of group.children)if(object.userData.landmark)object.visible=id===null;if(item){targetPoint.set(centers[station].x+item.x+((id==='burden'||id==='court'||id==='study')?.4:0),1,item.z+((id==='burden'||id==='court')?1.75:id==='study'?1.1:0));heroDestination.set(centers[station].x+item.x+.8,0,item.z+((id==='burden'||id==='court')?3.5:id==='study'?2.2:1.4));desiredDistance=Math.max(10,5/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));camera.position.copy(controls.target).add(new THREE.Vector3(id==='prison'?8:-6,6,10).setLength(desiredDistance))}else{targetPoint.set(centers[station].x,1,0);heroDestination.set(centers[station].x,0,2);desiredDistance=16}if(matchMedia('(prefers-reduced-motion: reduce)').matches){camera.position.add(targetPoint.clone().sub(controls.target));controls.target.copy(targetPoint);const offset=camera.position.clone().sub(controls.target).setLength(desiredDistance);camera.position.copy(controls.target).add(offset);desiredDistance=null;walker.position.copy(heroDestination)}}
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(group.children,true).find(x=>x.object.userData.landmark);if(hit)focus(hit.object.userData.landmark)});
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}new ResizeObserver(resize).observe(container);resize();
  const clock=new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    const dt=Math.min(clock.getDelta(),.05);
    if(journey){
      if(journey.phase==='board'){
        const goal=new THREE.Vector3(boat.position.x,boat.position.y+.5,boat.position.z);
        const direction=goal.clone().sub(walker.position);const distance=direction.length();
        if(distance<.06){walker.position.copy(goal);journey.phase='sail'}else walker.position.addScaledVector(direction,Math.min(1,dt*7/distance));
        targetPoint.set(walker.position.x,1,walker.position.z);
      }else if(journey.phase==='sail'){
        const destination=centers[journey.destination].x;const delta=destination-boat.position.x;
        if(Math.abs(delta)<.05){boat.position.x=destination;journey.phase='disembark'}else{
          boat.position.x+=Math.sign(delta)*Math.min(Math.abs(delta),dt*7);boat.rotation.y=delta>0?Math.PI/2:-Math.PI/2;
        }
        walker.position.set(boat.position.x,boat.position.y+.5,boat.position.z);targetPoint.set(boat.position.x,1,boat.position.z);
      }else{
        const goal=new THREE.Vector3(boat.position.x,0,6.5);const direction=goal.clone().sub(walker.position);const distance=direction.length();
        if(distance<.06)finishTravel();else walker.position.addScaledVector(direction,Math.min(1,dt*7/distance));
      }
    }else{walker.position.x+=(heroDestination.x-walker.position.x)*.035;walker.position.z+=(heroDestination.z-walker.position.z)*.035}
    const before=controls.target.clone();controls.target.lerp(targetPoint,.045);camera.position.add(controls.target.clone().sub(before));const offset=camera.position.clone().sub(controls.target);const distance=offset.length();if(distance&&desiredDistance!==null){camera.position.copy(controls.target).add(offset.multiplyScalar((distance+(desiredDistance-distance)*.025)/distance));if(Math.abs(distance-desiredDistance)<.05)desiredDistance=null}controls.update();renderer.render(scene,camera)
  });setStation(0);return {setStation,focus,overview,travelTo,skipTravel:finishTravel,riverInspect(){return {scene,camera,islands,river:water,bridges,boat,character:walker,travel}},capture(){renderer.render(scene,camera);const source=renderer.domElement;if(!source.width||!source.height)return null;const image=document.createElement('canvas');image.width=320;image.height=200;const ctx=image.getContext('2d');ctx.drawImage(source,0,0,image.width,image.height);return image.toDataURL('image/jpeg',.72)}};
}
