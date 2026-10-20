// A padded envelope standing on its sealed lower edge. Its printed broad side
// lies in the y/z plane, exactly like the mailer entering the reference mailbox.
// The envelope is modelled once; opening only translates it out of the cavity.
export function createMailer({THREE,texture,random,paperGrain}){
  const group=new THREE.Group();
  const length=3.55,bottom=.12,top=2.94,height=top-bottom;
  const clamp=THREE.MathUtils.clamp;
  const smooth=(a,b,t)=>{t=clamp((t-a)/(b-a),0,1);return t*t*(3-2*t);};
  // Align the pressed film cells with the existing geometry. The previous
  // larger, unaligned bump pattern scattered the highlights into rubbery noise.
  function drawFilmCells(c,w,h,roughness=false){
    c.fillStyle=roughness?'#f2f2f2':'#777777';c.fillRect(0,0,w,h);
    const rx=.056/length*w,ry=.049/height*h;
    for(let row=-1;row<29;row++)for(let col=-1;col<32;col++){
      const x=(col*.12+(row%2)*.06)/length*w,y=h-row*.108/height*h;
      c.save();c.translate(x,y);c.scale(rx,ry);
      const g=c.createRadialGradient(0,0,0,0,0,1);
      if(roughness){
        g.addColorStop(0,'#c7c7c7');g.addColorStop(.58,'#cfcfcf');g.addColorStop(.85,'#e8e8e8');g.addColorStop(1,'#f2f2f2');
      }else{
        g.addColorStop(0,'#b8b8b8');g.addColorStop(.48,'#afafaf');g.addColorStop(.75,'#929292');g.addColorStop(.91,'#666666');g.addColorStop(1,'#777777');
      }
      c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();
    }
    // Almost invisible film grain keeps broad highlights continuous and clean.
    c.globalAlpha=roughness?.017:.024;
    for(let i=0;i<14000;i++){c.fillStyle=random()>.5?'#fff':'#444';c.fillRect(random()*w,random()*h,1,1);}
  }
  const emboss=texture(1024,1024,(c,w,h)=>drawFilmCells(c,w,h));
  const filmRoughness=texture(1024,1024,(c,w,h)=>drawFilmCells(c,w,h,true));
  for(const map of [emboss,filmRoughness]){map.colorSpace=THREE.NoColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;}
  // A thin metallised coating over a padded paper body: acidic green in the
  // diffuse surface, tightly controlled glossy relief rather than silver beads.
  const green=new THREE.MeshPhysicalMaterial({color:0x63ef0a,metalness:.24,roughness:.28,roughnessMap:filmRoughness,clearcoat:.36,clearcoatRoughness:.23,clearcoatRoughnessMap:filmRoughness,bumpMap:emboss,bumpScale:.0065,envMapIntensity:.85});
  const seamMaterial=new THREE.MeshPhysicalMaterial({color:0x57d817,metalness:.16,roughness:.31,clearcoat:.28,clearcoatRoughness:.29,bumpMap:paperGrain,bumpScale:.00045,envMapIntensity:.8});
  function thickness(q,y){
    const longitudinal=clamp(q/length,0,1);
    const vertical=clamp((y-bottom)/height,0,1);
    const edge=smooth(.02,.19,q)*smooth(.02,.19,length-q);
    // A shallow air chamber curves in both directions. Its taper spans the
    // whole face instead of ending in the vertical walls of a solid slab.
    const seal=smooth(.012,.085,vertical)*(1-smooth(.91,.988,vertical));
    const domeQ=Math.pow(Math.max(0,Math.sin(longitudinal*Math.PI)),.52);
    const domeY=Math.pow(Math.max(0,Math.sin(vertical*Math.PI)),.66);
    const looseAir=.028*Math.exp(-(((q-.92)/.72)**2+((y-1.72)/.8)**2));
    const envelope=.014+(.075+.345*domeQ*domeY+looseAir)*seal*edge;
    const roof=y>1.7?Math.sqrt(Math.max(0,1.305*1.305-(y-1.7)*(y-1.7)))-.028:1.285;
    const endCrease=(Math.sin(y*37+q*8)*.0025+Math.sin(y*71-q*4)*.001)*(1-edge)*Math.sin(vertical*Math.PI);
    return Math.max(.014,Math.min(envelope,roof))+endCrease;
  }
  function relief(q,y){
    const row=Math.round((y-bottom)/.108),shift=(row%2)*.06;
    const centerQ=Math.round((q-shift)/.12)*.12+shift,centerY=bottom+row*.108;
    const d=((q-centerQ)/.056)**2+((y-centerY)/.049)**2;
    return .016*Math.pow(Math.max(0,1-d),.85)*smooth(.065,.19,q)*smooth(.065,.19,length-q)*smooth(bottom+.025,bottom+.14,y)*smooth(top-.025,top-.14,y);
  }
  // The shallow air chamber keeps its squeezed seals and an irregular centre
  // surface. Folds bend both sheets together without turning into hard ridges.
  const folds=[
    {q:.22,y:2.72,angle:-.82,length:.43,width:.045,depth:.034},
    {q:.18,y:.32,angle:.73,length:.36,width:.042,depth:-.028},
    {q:1.24,y:.24,angle:.08,length:.64,width:.045,depth:.029},
    {q:2.19,y:2.61,angle:-.57,length:.48,width:.054,depth:-.033},
    {q:2.10,y:.45,angle:.66,length:.41,width:.052,depth:.024},
    {q:.88,y:1.24,angle:1.02,length:.43,width:.075,depth:.012}
  ].map(f=>({...f,c:Math.cos(f.angle),s:Math.sin(f.angle)}));
  function surface(q,y,side=1,raised=true,offset=0){
    const u=clamp(q/length,0,1),v=clamp((y-bottom)/height,0,1);
    const leading=1-smooth(0,.48,q),trailing=smooth(length-.43,length,q);
    const sweep=leading*(.024+.023*Math.sin(v*5.3+.4))-trailing*(.014+.010*Math.sin(v*6.4+.8))+.010*Math.sin(q*4.2+v*2.3)*Math.sin(u*Math.PI);
    const topEdge=smooth(.78,.985,v),bottomEdge=1-smooth(.015,.17,v);
    const topWave=(.035*Math.sin(q*2.7+.6)+.016*Math.sin(q*6.5+1.1))*topEdge;
    const bottomWave=(.012+.009*Math.sin(q*4.1+.3))*bottomEdge;
    let bend=.045*Math.sin(u*Math.PI)*Math.sin(v*Math.PI+.12)+.013*(v-.5)*Math.sin(q*3.6);
    for(const f of folds){
      const dq=q-f.q,dy=y-f.y,along=(dq*f.c+dy*f.s)/f.length,across=(-dq*f.s+dy*f.c)/f.width;
      bend+=f.depth*(1-2*across*across)*Math.exp(-across*across-Math.pow(along,4));
    }
    return [bend+side*(thickness(q,y)+(raised?relief(q,y):0))+offset,y+topWave+bottomWave,-q-sweep];
  }
  const columns=128,rows=136;
  function face(side){
    const positions=[],uvs=[],indices=[];
    for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
      const q=i/columns*length,y=bottom+j/rows*height;
      positions.push(...surface(q,y,side));uvs.push(i/columns,j/rows);
    }
    for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
      const a=j*(columns+1)+i,b=a+1,d=a+columns+1,e=d+1;
      if(side>0)indices.push(a,b,d,b,e,d);else indices.push(a,d,b,b,d,e);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,green);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
  }
  face(1);face(-1);
  // Closed crimped perimeter with a narrow double heat seal.
  function strip(q1,y1,q2,y2,halfWidth=.014,orientation='q'){
    const positions=[],uvs=[],indices=[],steps=160;
    for(let i=0;i<=steps;i++){
      const t=i/steps,q=THREE.MathUtils.lerp(q1,q2,t),y=THREE.MathUtils.lerp(y1,y2,t);
      for(let s=0;s<2;s++){
        const qq=q+(orientation==='q'?(s-.5)*halfWidth*2:0),yy=y+(orientation==='y'?(s-.5)*halfWidth*2:0);
        positions.push(...surface(qq,yy,1,false,.009));uvs.push(t,s);
      }
    }
    for(let i=0;i<steps;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=seamMaterial.clone();material.side=THREE.DoubleSide;
    const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;group.add(mesh);
  }
  strip(.038,bottom+.01,.038,top-.01,.018);strip(.078,bottom+.02,.078,top-.02,.008);
  strip(length-.038,bottom+.01,length-.038,top-.01,.018);strip(.05,bottom+.045,length-.05,bottom+.045,.021,'y');strip(.05,top-.045,length-.05,top-.045,.021,'y');
  const perimeter=[];
  for(let i=0;i<=160;i++)perimeter.push([length*i/160,bottom]);
  for(let i=1;i<=140;i++)perimeter.push([length,bottom+height*i/140]);
  for(let i=1;i<=160;i++)perimeter.push([length*(1-i/160),top]);
  for(let i=1;i<=140;i++)perimeter.push([0,top-height*i/140]);
  const sidePositions=[],sideIndices=[];
  for(const [q,y] of perimeter)sidePositions.push(...surface(q,y,1,false),...surface(q,y,-1,false));
  for(let i=0;i<perimeter.length-1;i++){const a=i*2;sideIndices.push(a,a+2,a+1,a+1,a+2,a+3);}
  const sideGeometry=new THREE.BufferGeometry();sideGeometry.setAttribute('position',new THREE.Float32BufferAttribute(sidePositions,3));sideGeometry.setIndex(sideIndices);sideGeometry.computeVertexNormals();
  const sideMat=seamMaterial.clone();sideMat.side=THREE.DoubleSide;const sideMesh=new THREE.Mesh(sideGeometry,sideMat);sideMesh.castShadow=sideMesh.receiveShadow=true;group.add(sideMesh);
  const labelTexture=texture(1536,2048,(c,w,h)=>{
    c.fillStyle='#f4f4ee';c.fillRect(0,0,w,h);
    const margin=100;
    c.fillStyle='#21271f';c.beginPath();c.roundRect(margin,100,68,68,15);c.fill();c.fillStyle='#f2f4eb';c.font='600 44px Arial';c.fillText('L',margin+22,151);
    c.fillStyle='#171b16';c.font='400 31px Arial';c.fillText('LI LINJING  /  PRIVATE DELIVERY',margin,247);
    c.font='500 41px "Microsoft YaHei",sans-serif';c.fillText('设计师的个人作品',margin,302);
    c.font='600 300px "Microsoft YaHei",sans-serif';c.fillText('设计师',margin-11,630);c.fillText('作品集',margin-11,950);
    c.fillStyle='#303b2b';c.font='400 43px Arial';c.fillText('AI VISUAL DESIGNER',margin,1025);
    c.strokeStyle='#aeb5a4';c.lineWidth=2;c.beginPath();c.moveTo(margin,1091);c.lineTo(w-margin,1091);c.stroke();
    c.fillStyle='#3d4538';c.font='400 27px Arial';c.fillText('SELECTED WORKS',margin,1173);c.fillText('ART DIRECTION / AI VISUAL',margin,1225);
    c.font='400 38px "Microsoft YaHei",sans-serif';c.fillText('李临静',margin,1331);
    const pillX=1000,pillY=1270;
    c.fillStyle='#8ee756';c.beginPath();c.ellipse(pillX,pillY,168,96,-.18,0,Math.PI*2);c.fill();c.fillStyle='#253d1d';c.font='400 42px Arial';c.fillText('OPEN ME',pillX-108,pillY+15);
    let barcode=margin;while(barcode<740){const bar=2+Math.floor(random()*6);c.fillStyle='#283021';c.fillRect(barcode,1478,bar,139);barcode+=bar+2+Math.floor(random()*7);}
    c.font='400 23px Arial';c.fillText('LJ  —  2026  —  001',margin,1668);
    c.font='400 127px Arial';c.fillText('2026',1034,1617);
    c.strokeStyle='#aeb5a4';c.beginPath();c.moveTo(margin,1751);c.lineTo(w-margin,1751);c.stroke();
    c.fillStyle='#4a5143';c.font='400 25px Arial';c.fillText('HANDLE WITH CURIOSITY',margin,1854);c.textAlign='right';c.fillText('01 / 26',w-margin,1854);
    c.globalAlpha=.014;for(let i=0;i<24000;i++){c.fillStyle=random()>.5?'#fff':'#6a705e';c.fillRect(random()*w,random()*h,1,1);}
  });
  const paperSurface=texture(512,512,(c,w,h)=>{
    c.fillStyle='#e8e8e8';c.fillRect(0,0,w,h);c.globalAlpha=.09;
    for(let i=0;i<14000;i++){c.fillStyle=random()>.5?'#fff':'#b4b4b4';c.fillRect(random()*w,random()*h,1,1);}
    c.globalAlpha=.06;c.strokeStyle='#aaa';c.lineWidth=.45;
    for(let i=0;i<700;i++){const x=random()*w,y=random()*h;c.beginPath();c.moveTo(x,y);c.lineTo(x+2+random()*3,y+random()*1.2);c.stroke();}
  });
  paperSurface.colorSpace=THREE.NoColorSpace;paperSurface.wrapS=paperSurface.wrapT=THREE.RepeatWrapping;paperSurface.repeat.set(2,2);
  const labelMaterial=new THREE.MeshStandardMaterial({map:labelTexture,color:0xffffff,roughness:.76,roughnessMap:paperSurface,metalness:0,bumpMap:paperSurface,bumpScale:.00065,envMapIntensity:.62,side:THREE.DoubleSide});
  function patch({q=.18,y=.49,width=1.62,height=2.17,material=labelMaterial,angle=0,offset=.024}){
    const positions=[],uvs=[],indices=[],cols=60,rs=74,radius=.055;
    const centerQ=q+width/2,centerY=y+height/2,c=Math.cos(angle),s=Math.sin(angle);
    for(let j=0;j<=rs;j++){
      const v=j/rs,dy=v*height,near=Math.min(dy,height-dy),inset=near<radius?radius-Math.sqrt(Math.max(0,radius*radius-(radius-near)**2)):0;
      for(let i=0;i<=cols;i++){
        const u=i/cols,lq=(u-.5)*(width-2*inset),ly=dy-height/2;
        const qq=centerQ+lq*c-ly*s,yy=centerY+lq*s+ly*c;
        positions.push(...surface(qq,yy,1,false,offset));uvs.push((inset+u*(width-2*inset))/width,v);
      }
    }
    for(let j=0;j<rs;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,d=a+cols+1,e=d+1;indices.push(a,b,d,b,e,d);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.castShadow=false;group.add(mesh);return mesh;
  }
  patch({});
  // A cobalt roundel overlaps the lower edge of the paper address label.
  const stampTexture=texture(640,600,(c,w,h)=>{
    c.fillStyle='#f4f4e9';c.beginPath();c.arc(w/2,h/2,270,0,Math.PI*2);c.fill();
    c.fillStyle='#244bff';c.beginPath();c.arc(w/2,h/2,247,0,Math.PI*2);c.fill();
    c.fillStyle='#f3f5ee';c.textAlign='center';c.font='500 163px Arial';c.fillText('LLJ',w/2,h*.56);
    c.font='400 54px Arial';c.fillText('2026',w/2,h*.72);
  });
  const stampMaterial=new THREE.MeshStandardMaterial({map:stampTexture,metalness:0,roughness:.5,envMapIntensity:.65,side:THREE.DoubleSide,forceSinglePass:true,transparent:true,alphaTest:.3});
  patch({q:.7,y:.21,width:.51,height:.48,material:stampMaterial,angle:-.17,offset:.038});
  function update(out){
    // A small release of compression gives the air-filled pouch a soft rebound.
    // Its trajectory stays on the same axis, including the 2% settling travel.
    group.position.set(0,0,1.24+2.30*clamp(out,0,1.02));
    group.scale.x=1-.045*Math.sin(clamp(out,0,1)*Math.PI);
  }
  update(0);return {group,update};
}
