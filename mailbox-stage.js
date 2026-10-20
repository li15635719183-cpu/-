import * as THREE from './assets/vendor/three.module.js';
import { createMailer } from './parcel-upright.js';
import { addMailboxStickers } from './mailbox-stickers.js';
import { createMachinedMetal } from './machined-metal.js';
import { createLidReflection } from './lid-reflection.js';
import { createAnimationProfile } from './animation-profile.js';
import { createTitleReflection } from './title-reflection.js';

// All models, print, studio reflections and motion are generated locally.
const host=document.querySelector('#scene');
const trigger=document.querySelector('#open-mail');
const label=trigger.querySelector('.control-label');
const status=document.querySelector('#mail-status');
const fallbackMessage=host.querySelector('.scene-fallback>span');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
function enableFallback(){
  document.body.dataset.mail='fallback';
  if(fallbackMessage)fallbackMessage.textContent='作品来信已准备好';
  label.textContent='点击开启作品来信';trigger.disabled=false;
  trigger.onclick=()=>{
    document.body.dataset.mail='opening';trigger.disabled=true;label.textContent='正在开启';
    setTimeout(()=>{document.body.dataset.mail='open';trigger.disabled=false;trigger.setAttribute('aria-expanded','true');label.textContent='来信已开启';status.textContent='向下滚动，认识我';},reduced.matches?0:400);
  };
}
try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});await build();}
catch(error){console.error('Mailbox scene could not start',error);enableFallback();}

async function build(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.99;
  renderer.setClearColor(0,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),rig=new THREE.Group();scene.add(rig);
  const camera=new THREE.PerspectiveCamera(32,1,.1,100);
  const profile=createAnimationProfile(host,renderer);
  // A neutral product studio: dark separation cards between precise softboxes
  // reveal the arch, rolled lip and the thickness of the machined lower rail.
  const ew=2048,eh=1024,studioData=new Float32Array(ew*eh*4);
  const wrapDistance=(a,b)=>Math.min(Math.abs(a-b),1-Math.abs(a-b));
  const softBox=(d,half,feather)=>1-THREE.MathUtils.smoothstep(Math.abs(d),half-feather,half+feather);
  const panel=(u,v,cu,cv,w,h,feather=.006)=>softBox(wrapDistance(u,cu),w/2,feather)*softBox(v-cv,h/2,feather);
  for(let y=0;y<eh;y++)for(let x=0;x<ew;x++){
    const u=x/ew,v=y/(eh-1);
    // Finite studio cards leave real black intervals between reflected lights.
    // A full white horizon/ceiling would wash the steel into grey plastic.
    const shoulder=2.4*panel(u,v,.22,.65,.25,.12);
    const top=1.8*panel(u,v,.095,.54,.10,.06);
    const strip=3.5*panel(u,v,.40,.482,.25,.010,.002);
    const rimLight=5.2*panel(u,v,.66,.59,.022,.42,.003);
    const frontCard=1.05*panel(u,v,.91,.50,.09,.22);
    const badgeCard=.75*panel(u,v,.415,.507,.075,.04,.004);
    const fillCard=.28*panel(u,v,.035,.49,.04,.30);
    const light=shoulder+top+strip+rimLight+frontCard+badgeCard+fillCard;
    const i=(y*ew+x)*4;
    studioData[i]=.018+light;
    studioData[i+1]=.019+light;
    studioData[i+2]=.021+light;
    studioData[i+3]=1;
  }
  const studioTexture=new THREE.DataTexture(studioData,ew,eh,THREE.RGBAFormat,THREE.FloatType);studioTexture.colorSpace=THREE.LinearSRGBColorSpace;studioTexture.mapping=THREE.EquirectangularReflectionMapping;studioTexture.needsUpdate=true;
  const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromEquirectangular(studioTexture);scene.environment=environment.texture;pmrem.dispose();studioTexture.dispose();
  scene.add(new THREE.HemisphereLight(0xf5f5ef,0x08090b,.24));
  const key=new THREE.DirectionalLight(0xfffcf5,2.10);key.position.set(6,8,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-5,right:5,top:6,bottom:-4,near:.1,far:30});key.shadow.normalBias=.004;key.shadow.bias=-.00005;key.shadow.radius=3;scene.add(key);
  const fill=new THREE.DirectionalLight(0xf0f3f5,.35);fill.position.set(5,2,-4);scene.add(fill);
  const front=new THREE.DirectionalLight(0xffffff,.48);front.position.set(5,3,8);scene.add(front);
  let seed=73;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;}
  const grain=texture(256,256,(c,w,h)=>{const d=c.createImageData(w,h);for(let i=0;i<d.data.length;i+=4){const v=120+random()*22;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}c.putImageData(d,0,0);});grain.colorSpace=THREE.NoColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(4,4);
  const titleReflection=createTitleReflection({THREE,heading:document.querySelector('.entry-title')});
  const chrome=createMachinedMetal(THREE,grain,titleReflection.uniforms);
  const edge=new THREE.MeshStandardMaterial({color:0xd4d6da,metalness:1,roughness:.085,envMapIntensity:1.20});
  const inner=new THREE.MeshStandardMaterial({color:0x666c74,metalness:1,roughness:.27,envMapIntensity:.75,side:THREE.DoubleSide});
  const hardware=chrome.clone();hardware.roughness=.22;
  const black=new THREE.MeshStandardMaterial({color:0x111615,roughness:.36,metalness:.35});
  const paperGrain=texture(512,512,(c,w,h)=>{const d=c.createImageData(w,h);for(let i=0;i<d.data.length;i+=4){const v=110+random()*65;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}c.putImageData(d,0,0);c.strokeStyle='#bcbcbc';c.lineWidth=.6;for(let i=0;i<1700;i++){const x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+random()*5,y+random()*2);c.stroke();}});paperGrain.colorSpace=THREE.NoColorSpace;paperGrain.wrapS=paperGrain.wrapT=THREE.RepeatWrapping;paperGrain.repeat.set(3,4);
  function add(geometry,material,parent=rig,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function rr(w,h,r,x=-w/2,y=-h/2){const s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
  function solid(shape,depth,mat,parent=rig,x=0,y=0,z=0,bevel=.025,detail={curveSegments:64,bevelSegments:4}){
    const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:detail.bevelSegments,bevelSize:bevel,bevelThickness:bevel,curveSegments:detail.curveSegments,steps:1});
    // Extrusion defaults to flat shading. Join coincident normals so chrome has
    // continuous softbox reflections around the arch and its rolled edges.
    const p=geometry.attributes.position,n=geometry.attributes.normal,joined=new Map(),keys=[];
    for(let i=0;i<p.count;i++){const k=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*100000)).join(',');keys.push(k);if(!joined.has(k))joined.set(k,[]);joined.get(k).push(new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)));}
    const baseNormal=new THREE.Vector3(),averaged=new THREE.Vector3();
    for(let i=0;i<p.count;i++){
      baseNormal.set(n.getX(i),n.getY(i),n.getZ(i));
      // Flat sheets stay flat; bevel normals must not bow an entire panel.
      if(Math.max(Math.abs(baseNormal.x),Math.abs(baseNormal.y),Math.abs(baseNormal.z))>.999999)continue;
      averaged.set(0,0,0);for(const v of joined.get(keys[i]))if(v.dot(baseNormal)>.84)averaged.add(v);
      averaged.normalize();n.setXYZ(i,averaged.x,averaged.y,averaged.z);
    }n.needsUpdate=true;
    return add(geometry,mat,parent,x,y,z);
  }
  function tube(points,r,mat,parent=rig){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),100,r,12,false),mat,parent);}
  function screw(x,y,z,parent=rig){const m=add(new THREE.CylinderGeometry(.055,.055,.025,24),edge,parent,x,y,z);m.rotation.x=Math.PI/2;const slot=add(new THREE.BoxGeometry(.065,.01,.006),black,parent,x,y,z+.017);slot.rotation.z=.5;}
  function arch(r=1.4,bottom=0,shoulder=1.7){const s=new THREE.Shape();s.moveTo(-r,bottom);s.lineTo(r,bottom);s.lineTo(r,shoulder);s.absarc(0,shoulder,r,0,Math.PI,false);s.lineTo(-r,bottom);s.closePath();return s;}
  function rim(z,r=1.435,mat=edge){const shape=arch(r);const hole=arch(r-.10,.055,1.7);shape.holes.push(new THREE.Path(hole.getPoints(64)));return solid(shape,.07,mat,rig,0,0,z,.022);}
  // Rolled sheet construction: a real open cavity behind a hinged front door.
  const shell=arch();shell.holes.push(new THREE.Path(arch(1.34,.06,1.7).getPoints(64)));
  solid(shell,3.7,chrome,rig,0,0,-2.4,.022);
  const lining=arch(1.338,.065,1.7);lining.holes.push(new THREE.Path(arch(1.312,.09,1.7).getPoints(64)));solid(lining,3.59,inner,rig,0,0,-2.36,.008);
  solid(arch(1.37,.02,1.7),.055,chrome,rig,0,0,-2.41,.025);
  rim(1.29);rim(-2.39,1.407,chrome);
  const mouthSeal=arch(1.347,.06,1.7);mouthSeal.holes.push(new THREE.Path(arch(1.32,.087,1.7).getPoints(64)));solid(mouthSeal,.012,black,rig,0,0,1.326,.004);
  solid(rr(2.82,.14,.025),3.6,chrome,rig,0,-.11,-2.35,.012,{curveSegments:16,bevelSegments:3});
  // Keep the socket height fixed; the continuous steel post exits the page.
  const postHeight=12;
  const post=add(new THREE.CylinderGeometry(.29,.29,postHeight,64),chrome,rig,0,-.125-postHeight/2,-.55);
  add(new THREE.CylinderGeometry(.43,.43,.075,64),edge,rig,0,-.23,-.55);
  const flag=new THREE.Group();flag.position.set(1.44,.84,-.62);rig.add(flag);
  add(new THREE.CylinderGeometry(.04,.04,2.55,16),edge,flag,0,1.23,0);
  const flagPlate=solid(rr(.72,.56,.09),.055,edge,flag,0,2.23,0,.025,{curveSegments:16,bevelSegments:3});flagPlate.rotation.y=Math.PI/2;
  // A satin inset keeps the engraved mark legible between bright studio cards.
  const flagFace=add(new THREE.ShapeGeometry(rr(.64,.48,.065),32),new THREE.MeshStandardMaterial({color:0xc6c8c7,metalness:.4,roughness:.32,envMapIntensity:.65}),flag,.083,2.23,0);
  flagFace.rotation.y=Math.PI/2;flagFace.castShadow=false;
  const flagMarkTexture=texture(768,512,(c,w,h)=>{
    c.fillStyle='#17324c';c.textAlign='center';c.font='700 230px Arial';
    c.fillText('LLJ',w*.5,h*.53);c.font='500 113px Arial';c.fillText('2026',w*.5,h*.83);
  });
  const flagMark=new THREE.Mesh(new THREE.PlaneGeometry(.60,.42),new THREE.MeshStandardMaterial({map:flagMarkTexture,transparent:true,alphaTest:.20,roughness:.72,metalness:0,depthWrite:false,envMapIntensity:.40}));
  flagMark.position.set(.089,2.23,0);flagMark.rotation.y=Math.PI/2;flagMark.receiveShadow=true;flag.add(flagMark);
  const flagPin=add(new THREE.CylinderGeometry(.17,.17,.11,48),edge,flag,0,0,0);flagPin.rotation.z=Math.PI/2;
  const flagDot=add(new THREE.CylinderGeometry(.075,.075,.12,32),black,flag,.07,0,0);flagDot.rotation.z=Math.PI/2;
  const door=new THREE.Group();door.position.set(0,.015,1.35);rig.add(door);
  solid(arch(1.375,.015,1.7),.065,chrome,door,0,0,-.025,.033);
  solid(arch(1.29,.1,1.7),.008,inner,door,0,0,-.065,.012);
  // Chrome keeps its environment reflection in a real shadow. A restrained
  // contact layer makes the parcel's weight legible on the inside of the lid.
  // Use the lid outline itself, so the feathered shadow cannot leave its edge.
  const lidShadowTexture=texture(256,512,(c,w,h)=>{
    const pixels=c.createImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const u=Math.abs((x+.5)/w-.5),v=Math.abs((y+.5)/h-.5);
      const lengthFade=Math.exp(-Math.pow(v/.375,8));
      const soft=.38*Math.exp(-Math.pow(u/.29,4));
      const contact=.25*Math.exp(-Math.pow(u/.11,2));
      pixels.data[(y*w+x)*4+3]=Math.round(255*(soft+contact)*lengthFade);
    }
    c.putImageData(pixels,0,0);
  });
  const lidShadowGeometry=new THREE.ShapeGeometry(arch(1.285,.105,1.7),96);
  const lidShadowPositions=lidShadowGeometry.attributes.position,lidShadowUVs=lidShadowGeometry.attributes.uv;
  const lidWidth=2.57,lidBottom=.105,lidHeight=2.88;
  for(let i=0;i<lidShadowPositions.count;i++)lidShadowUVs.setXY(i,(lidShadowPositions.getX(i)+lidWidth/2)/lidWidth,(lidShadowPositions.getY(i)-lidBottom)/lidHeight);
  const lidShadowMaterial=new THREE.MeshBasicMaterial({map:lidShadowTexture,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const lidShadow=new THREE.Mesh(lidShadowGeometry,lidShadowMaterial);lidShadow.position.z=-.086;lidShadow.renderOrder=2;door.add(lidShadow);
  const lidReflection=createLidReflection({THREE,geometry:lidShadowGeometry.clone(),exclude:[door,post]});
  lidReflection.position.z=-.085;lidReflection.rotation.y=Math.PI;lidReflection.visible=false;door.add(lidReflection);
  function updateLidShadow(out){
    const frontDistance=1.24+2.30*clamp(out,0,1)-door.position.z;
    const exposed=Math.max(0,frontDistance/Math.max(.2,Math.sin(door.rotation.x)));
    const length=Math.max(.42,exposed+.30),centerY=exposed*.5-.06,centerX=.065;
    lidShadowTexture.repeat.set(lidWidth/1.40,lidHeight/length);
    lidShadowTexture.offset.set(.5-(centerX+lidWidth/2)/1.40,.5-(centerY-lidBottom)/length);
    lidShadowMaterial.opacity=THREE.MathUtils.smoothstep(door.rotation.x,.90,1.45)*THREE.MathUtils.smoothstep(exposed,.015,.32);
    lidShadow.visible=lidShadowMaterial.opacity>.001;
  }
  // Keep a little reflected light in the cavity, with depth occlusion on the
  // actual inner contour rather than a dark card across the open mouth.
  const cavityBack=-2.32,cavityFront=1.22,cavityWidth=2.602,cavityFloor=.103;
  const cavityContour=[[-1.301,cavityFloor],[1.301,cavityFloor],[1.301,1.7]];
  for(let i=1;i<=64;i++){const a=i/64*Math.PI;cavityContour.push([1.301*Math.cos(a),1.7+1.301*Math.sin(a)]);}
  cavityContour.push([-1.301,cavityFloor]);
  const cavityPositions=[],cavityColors=[],cavityIndices=[],depthSteps=18;
  for(let j=0;j<=depthSteps;j++){
    const depth=j/depthSteps,z=THREE.MathUtils.lerp(cavityFront,cavityBack,depth);
    for(const [x,y] of cavityContour){
      cavityPositions.push(x,y,z);
      const roofWeight=1-.28*THREE.MathUtils.smoothstep(y,1.7,2.8);
      const opacity=(.06+.16*Math.pow(depth,.8))*THREE.MathUtils.smoothstep(depth,0,.16)*roofWeight;
      cavityColors.push(0,0,0,opacity);
    }
  }
  for(let j=0;j<depthSteps;j++)for(let i=0;i<cavityContour.length-1;i++){
    const a=j*cavityContour.length+i,b=a+cavityContour.length;cavityIndices.push(a,b,a+1,b,b+1,a+1);
  }
  const cavityGeometry=new THREE.BufferGeometry();cavityGeometry.setAttribute('position',new THREE.Float32BufferAttribute(cavityPositions,3));cavityGeometry.setAttribute('color',new THREE.Float32BufferAttribute(cavityColors,4));cavityGeometry.setIndex(cavityIndices);
  const cavityShadeMaterial=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,toneMapped:false});
  const cavityShade=new THREE.Mesh(cavityGeometry,cavityShadeMaterial);cavityShade.renderOrder=1;rig.add(cavityShade);
  const backShadeGeometry=new THREE.ShapeGeometry(arch(1.301,cavityFloor,1.7),96);
  const backShade=new THREE.Mesh(backShadeGeometry,new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.22,depthWrite:false,toneMapped:false}));backShade.position.z=cavityBack;backShade.renderOrder=1;rig.add(backShade);
  // The floor contact follows the portion of the same parcel still inside.
  // Its clipped rectangular receiver ends behind the lip and before the back.
  const floorShadowTexture=lidShadowTexture.clone();floorShadowTexture.needsUpdate=true;
  const floorShadowGeometry=new THREE.BufferGeometry();floorShadowGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-cavityWidth/2,cavityFloor+.003,cavityBack,cavityWidth/2,cavityFloor+.003,cavityBack,-cavityWidth/2,cavityFloor+.003,cavityFront,cavityWidth/2,cavityFloor+.003,cavityFront],3));floorShadowGeometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));floorShadowGeometry.setIndex([0,2,1,1,2,3]);
  const floorShadow=new THREE.Mesh(floorShadowGeometry,new THREE.MeshBasicMaterial({map:floorShadowTexture,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,toneMapped:false}));floorShadow.renderOrder=2;rig.add(floorShadow);
  function updateCavityShadow(out){
    const parcelFront=1.24+2.30*clamp(out,0,1),rear=Math.max(cavityBack,parcelFront-3.55);
    const remaining=Math.max(.05,cavityFront-rear),length=remaining+.32,centerZ=(rear+cavityFront)/2;
    floorShadowTexture.repeat.set(cavityWidth/1.50,(cavityFront-cavityBack)/length);
    floorShadowTexture.offset.set(.5-(.065+cavityWidth/2)/1.50,.5-(centerZ-cavityBack)/length);
  }
  const dRim=arch(1.35,.04,1.7);dRim.holes.push(new THREE.Path(arch(1.31,.08,1.7).getPoints(64)));solid(dRim,.016,edge,door,0,0,.05,.012);
  // The inset mail slot and rolled front lip follow the second reference.
  const slot=rr(1.62,.38,.035);slot.holes.push(new THREE.Path(rr(1.37,.17,.02).getPoints(16)));solid(slot,.09,edge,door,0,1.84,.07,.025,{curveSegments:16,bevelSegments:3});
  solid(rr(1.44,.23,.02),.008,black,door,0,1.84,.072,.01,{curveSegments:16,bevelSegments:3});
  const slotInset=rr(1.36,.16,.018);slotInset.holes.push(new THREE.Path(rr(1.24,.065,.01).getPoints(12)));solid(slotInset,.012,hardware,door,0,1.84,.14,.006,{curveSegments:16,bevelSegments:3});
  const hinge=add(new THREE.CylinderGeometry(.08,.08,2.5,48),hardware,rig,0,0,1.35);hinge.rotation.z=Math.PI/2;
  for(const x of [-1.12,1.12]){screw(x,.2,.081,door);screw(x,1.6,.081,door);}
  addMailboxStickers({THREE,rig,door,texture,random,paperGrain});
  // One upright padded envelope, with its printed broad side facing the camera.
  const mailer=createMailer({THREE,texture,random,paperGrain});rig.add(mailer.group);
  rig.position.set(.15,-.75,0);
  const restored=document.body.dataset.restoreMail==='open';
  let state=restored?'open':'closed',ready=false,contextLost=false,start=0,progress=restored?1:0,raf=0,last=0,px=0,py=0,tx=0,ty=0,distance=15;
  let designAspect=1,frameHeightRatio=1,frameWidth=1,frameHeight=1;
  let framingReady=false,framingClosed,framingOpen,framingTarget,framingClosedTarget;
  const clamp=THREE.MathUtils.clamp;
  const motionDuration={opening:1240,closing:950};
  const ease=t=>{t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
  const pop=t=>{t=clamp(t,0,1);const p=t*t*(3-2*t)-1,s=.72;return 1+(s+1)*p*p*p+s*p*p;};
  function pose(t){
    const compact=designAspect<.85;
    distance=Math.max(6.7,(compact?8.1:7.1)/designAspect)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*frameHeightRatio/(compact?1.06:1.14);
    // Clear the door first, then give the parcel one short axial pop and settle.
    // The small overshoot is under 2%; it never lifts or rotates the parcel.
    const opening=state==='opening';
    door.rotation.x=ease(t/(opening?.23:.25))*1.565;
    const out=opening?pop((t-.22)/.70):ease((t-.22)/.78);mailer.update(out);updateLidShadow(out);updateCavityShadow(out);
    titleReflection.uniforms.titleReveal.value=ease((t-.22)/.40);
    const reflectionFade=THREE.MathUtils.smoothstep(door.rotation.x,1.25,1.50)*THREE.MathUtils.smoothstep(out,.02,.24);
    lidReflection.material.uniforms.opacity.value=.38*reflectionFade;lidReflection.visible=reflectionFade>.001;
    const a=1.05+px,b=.19+py,target=new THREE.Vector3(compact?-.2:0,-.02,.45);
    camera.position.set(target.x+Math.sin(a)*Math.cos(b)*distance,target.y+Math.sin(b)*distance,target.z+Math.cos(a)*Math.cos(b)*distance);camera.lookAt(target);
    if(framingReady){
      // Follow the door's expanding silhouette, then hold the frame for the pop.
      const blend=Math.sin(door.rotation.x);
      const centerX=THREE.MathUtils.lerp(framingClosed.x,framingOpen.x,blend);
      const centerY=THREE.MathUtils.lerp(framingClosed.y,framingOpen.y,blend);
      const targetX=THREE.MathUtils.lerp(framingClosedTarget.x,framingTarget.x,blend);
      const targetY=THREE.MathUtils.lerp(framingClosedTarget.y,framingTarget.y,blend);
      camera.setViewOffset(frameWidth,frameHeight,(centerX-frameWidth/2)*camera.zoom+frameWidth/2-targetX,(centerY-frameHeight/2)*camera.zoom+frameHeight/2-targetY,frameWidth,frameHeight);
    }
    camera.updateMatrixWorld();rig.updateWorldMatrix(true,false);
  }
  function bodyBounds(){
    // Project the actual body and open lid, excluding the deliberately long post.
    rig.updateMatrixWorld(true);
    const point=new THREE.Vector3();let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    rig.traverse(mesh=>{
      if(!mesh.isMesh||mesh===post||!mesh.visible)return;
      const positions=mesh.geometry.attributes.position;if(!positions)return;
      for(let i=0;i<positions.count;i++){
        point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(camera);
        const x=(point.x*.5+.5)*frameWidth,y=(-point.y*.5+.5)*frameHeight;
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      }
    });
    return {x:(minX+maxX)/2,y:(minY+maxY)/2,width:maxX-minX,height:maxY-minY};
  }
  function resize(){
    // Keep the reference cover's composition with a real interactive model.
    const r=host.getBoundingClientRect();
    if(framingReady&&frameWidth===r.width&&frameHeight===r.height)return;
    frameWidth=r.width;frameHeight=r.height;designAspect=r.width/r.height;frameHeightRatio=1;
    renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;
    framingReady=false;camera.zoom=1;camera.clearViewOffset();camera.updateProjectionMatrix();
    pose(0);framingClosed=bodyBounds();pose(1);framingOpen=bodyBounds();
    const portrait=matchMedia('(max-width:700px) and (orientation:portrait)').matches;
    let availableWidth,availableHeight;
    if(portrait){
      // The mobile canvas has its own row, so the model cannot overlap navigation.
      availableWidth=r.width*.86;availableHeight=r.height*.82;
      framingTarget={x:r.width*.50,y:r.height*.47};
      framingClosedTarget={x:r.width*.50,y:r.height*.47};
    }else{
      availableWidth=r.width*.56;availableHeight=r.height*.61;
      framingTarget={x:r.width*.54,y:r.height*.565};
      framingClosedTarget={x:r.width*.5,y:r.height*.50};
    }
    camera.zoom=Math.min(2,availableWidth/Math.max(framingClosed.width,framingOpen.width),availableHeight/Math.max(framingClosed.height,framingOpen.height));
    framingReady=true;
    camera.updateProjectionMatrix();pose(1);titleReflection.update(camera,{width:r.width,height:r.height,left:r.left,top:r.top});pose(progress);renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  }
  function frame(now){raf=0;if(document.hidden)return;const dt=last?Math.min((now-last)/1000,.05):.016;last=now;const k=1-Math.exp(-dt*5);px+=(tx-px)*k;py+=(ty-py)*k;
    if(state==='opening'||state==='closing'){
      renderer.shadowMap.needsUpdate=true;
      if(!start)start=now;
      const phase=reduced.matches?1:clamp((now-start)/motionDuration[state],0,1);
      progress=state==='opening'?phase:1-phase;
      if(phase===1){state=progress===1?'open':'closed';document.body.dataset.mail=state;trigger.disabled=false;trigger.setAttribute('aria-expanded',String(state==='open'));label.textContent=state==='open'?'收起信箱':'点击开启作品来信';status.textContent=state==='open'?(matchMedia('(hover:hover) and (min-width:701px)').matches?'来信已送达 · 移动鼠标，探索细节':'来信已送达 · 开启我的作品集'):'';host.setAttribute('aria-label',state==='open'?'带纸质贴纸的深银色金属信箱与侧向弹出的绿色气泡包裹，竖向快递单印有设计师作品集和 2026':'黑色背景中的深银色金属信箱，点击信箱开启作品来信');}
    }
    const moving=state==='opening'||state==='closing';
    profile?.before(now);pose(progress);renderer.render(scene,camera);profile?.after(!moving);if(moving||Math.abs(tx-px)+Math.abs(ty-py)>.0001)raf=requestAnimationFrame(frame);
  }
  function wake(){if(!ready)return;if(!raf){last=0;raf=requestAnimationFrame(frame);}}
  function open(){if(!ready||state==='opening'||state==='closing')return;state=state==='open'?'closing':'opening';profile?.start(state);start=0;document.body.dataset.mail=state;trigger.disabled=true;label.textContent=state==='opening'?'正在开启':'正在收起';status.textContent='';tx=ty=0;wake();}
  trigger.addEventListener('click',open);host.addEventListener('click',()=>{if(state==='closed')open();});
  host.addEventListener('pointermove',e=>{if(!ready||reduced.matches||e.pointerType==='touch'||state==='opening'||state==='closing')return;const r=host.getBoundingClientRect();tx=((e.clientX-r.left)/r.width-.5)*.16;ty=-((e.clientY-r.top)/r.height-.5)*.1;wake();},{passive:true});
  host.addEventListener('pointerleave',()=>{tx=ty=0;wake();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(state==='opening'||state==='closing')start=performance.now()-(state==='opening'?progress:1-progress)*motionDuration[state];wake();}});
  reduced.addEventListener('change',()=>{tx=ty=0;wake();});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;contextLost=true;if(raf)cancelAnimationFrame(raf);raf=0;document.body.classList.remove('scene-ready');enableFallback();});
  resize();
  // Warm the open view, including offscreen reflection shaders and its target,
  // before accepting input. Reveal only the restored closed view.
  pose(1);await renderer.compileAsync(scene,camera);
  if(contextLost)return;
  renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  pose(progress);renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  ready=true;document.body.classList.add('scene-ready');trigger.disabled=false;trigger.setAttribute('aria-expanded',String(restored));label.textContent=restored?'收起信箱':'点击开启作品来信';
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  
}
