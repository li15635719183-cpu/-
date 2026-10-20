// Small printed paper decals on the mailbox side and hinged front.
export function addMailboxStickers({THREE,rig,door,texture,random,paperGrain}){
  function decal({z,y,width,height,angle=0,plane='side',x=0,lift=0,roughness=.93,draw}){
    const map=texture(768,768,(c,w,h)=>{
      c.save();c.translate(w*.05,h*.05);c.scale(.9,.9);draw(c,w,h);c.restore();
      // The paper extends beyond the ink as one continuous die-cut white rim.
      const ink=document.createElement('canvas');ink.width=w;ink.height=h;
      ink.getContext('2d').drawImage(c.canvas,0,0);
      const paper=document.createElement('canvas');paper.width=w;paper.height=h;
      const pc=paper.getContext('2d');pc.drawImage(ink,0,0);
      pc.globalCompositeOperation='source-in';pc.fillStyle='#f8f6ee';pc.fillRect(0,0,w,h);
      c.clearRect(0,0,w,h);
      const borderX=plane==='front'?.016/width*w:w*.034;
      const borderY=plane==='front'?.016/height*h:h*.034;
      for(let i=0;i<32;i++){
        const a=i/32*Math.PI*2;c.drawImage(paper,Math.cos(a)*borderX,Math.sin(a)*borderY);
      }
      c.drawImage(paper,0,0);c.drawImage(ink,0,0);
      // Grain is clipped to the die-cut paper, including its printed ink.
      c.globalCompositeOperation='source-atop';c.globalAlpha=.065;
      for(let i=0;i<18000;i++){
        c.fillStyle=random()>.5?'#fff':'#3b3933';
        c.fillRect(random()*w,random()*h,1,1);
      }
    });
    const positions=[],uvs=[],indices=[],cols=26,rows=24;
    const cs=Math.cos(angle),sn=Math.sin(angle);
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const u=i/cols,v=j/rows,lx=(u-.5)*width,ly=(v-.5)*height;
      // A lifted corner catches a little light; the rest stays pasted down.
      const curl=(plane==='front'?.003:.012)*Math.pow(u,8)*Math.pow(1-v,8);
      if(plane==='front')positions.push(x+lx*cs-ly*sn,y+lx*sn+ly*cs,.088+lift+curl);
      else positions.push(1.429+curl,y+lx*sn+ly*cs,z-lx*cs+ly*sn);
      uvs.push(u,v);
    }
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const a=j*(cols+1)+i,b=a+1,d=a+cols+1,e=d+1;
      indices.push(a,b,d,b,e,d);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=new THREE.MeshStandardMaterial({map,transparent:true,alphaTest:.4,roughness,metalness:0,bumpMap:paperGrain,bumpScale:.0013,envMapIntensity:.42});
    const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;(plane==='front'?door:rig).add(mesh);
  }
  decal({z:-1.82,y:1.10,width:.86,height:.88,angle:-.10,draw(c,w,h){
    c.fillStyle='#322cff';c.beginPath();c.moveTo(w*.43,h*.12);
    c.quadraticCurveTo(w*.5,h*.01,w*.57,h*.12);c.lineTo(w*.94,h*.78);
    c.quadraticCurveTo(w,h*.91,w*.84,h*.92);c.lineTo(w*.16,h*.92);
    c.quadraticCurveTo(0,h*.91,w*.06,h*.78);c.closePath();c.fill();
    c.strokeStyle='#e8e7dc';c.lineWidth=36;c.lineCap='butt';
    for(let i=0;i<3;i++){
      const a=Math.PI*i/3;c.beginPath();
      c.moveTo(w*.5-Math.cos(a)*142,h*.57-Math.sin(a)*142);
      c.lineTo(w*.5+Math.cos(a)*142,h*.57+Math.sin(a)*142);c.stroke();
    }
  }});
  decal({z:-1.56,y:.43,width:.92,height:.64,angle:.10,draw(c,w,h){
    c.fillStyle='#ff761b';c.beginPath();c.roundRect(62,55,w-124,h-110,185);c.fill();
    c.strokeStyle='#191a18';c.lineWidth=21;
    for(let i=0;i<3;i++){c.beginPath();c.ellipse(w*.5,h*(.33+i*.17),w*.31,h*.145,0,0,Math.PI*2);c.stroke();}
  }});
  decal({z:-1.38,y:1.56,width:.90,height:.26,angle:-.05,draw(c,w,h){
    c.fillStyle='#eeeee4';c.beginPath();c.roundRect(22,108,w-44,h-216,28);c.fill();
    c.fillStyle='#1e231f';c.font='600 96px Arial';c.textAlign='center';
    c.fillText('IDEAS IN TRANSIT',w*.5,h*.54);
    c.font='400 48px monospace';c.fillText('LI LINJING  /  2026',w*.5,h*.68);
  }});
  decal({z:.50,y:1.18,width:.88,height:.82,angle:.10,draw(c,w,h){
    c.fillStyle='#d2ff32';c.beginPath();c.roundRect(64,58,w-128,h-116,110);c.fill();
    c.fillStyle='#1b2419';
    for(let i=0;i<11;i++){
      const a=i/11*Math.PI*2;c.beginPath();
      c.arc(w*.5+Math.cos(a)*w*.235,h*.5+Math.sin(a)*h*.235,24,0,Math.PI*2);c.fill();
    }
    c.font='600 73px Arial';c.textAlign='center';c.fillText('AI',w*.5,h*.54);
  }});
  decal({z:.44,y:.43,width:1.06,height:.43,angle:-.07,draw(c,w,h){
    c.fillStyle='#252a27';c.beginPath();c.roundRect(34,130,w-68,h-260,42);c.fill();
    c.fillStyle='#f4f3e9';c.textAlign='center';c.font='600 120px Arial';
    c.fillText('VISUAL',w*.5,h*.55);c.font='400 51px monospace';
    c.fillText('HANDLE WITH CURIOSITY',w*.5,h*.69);
  }});
  if(door){
    // Bold, paper-thin label layers leave the arch and rolled metal edge clear.
    // Large type compensates for the square texture on long, shallow decals.
    decal({plane:'front',x:-.12,y:1.21,width:1.68,height:.44,angle:.06,draw(c,w,h){
      c.fillStyle='#3042ed';c.beginPath();c.roundRect(22,46,w-44,h-92,260);c.fill();
      c.fillStyle='#f6f1e5';c.textAlign='center';c.textBaseline='middle';
      c.font='900 498px "Arial Black",Arial,sans-serif';c.fillText('CONCEPT',w*.5,h*.53,w*.84);
    }});
    decal({plane:'front',x:-.31,y:.86,width:1.20,height:.42,angle:-.10,lift:.006,draw(c,w,h){
      c.fillStyle='#ff823d';c.beginPath();c.roundRect(23,45,w-46,h-90,260);c.fill();
      c.fillStyle='#212721';c.textAlign='center';c.textBaseline='middle';
      c.font='900 490px "Arial Black",Arial,sans-serif';c.fillText('CRAFT',w*.5,h*.53,w*.80);
    }});
    decal({plane:'front',x:-.18,y:.50,width:1.48,height:.34,angle:.07,lift:.012,draw(c,w,h){
      c.fillStyle='#f1ead5';c.beginPath();c.moveTo(w*.035,h*.10);c.lineTo(w*.98,h*.055);
      c.lineTo(w*.965,h*.91);c.lineTo(w*.02,h*.945);c.closePath();c.fill();
      c.fillStyle='#23343b';c.textAlign='center';c.textBaseline='middle';
      c.font='italic 900 505px "Arial Black",Arial,sans-serif';c.fillText('FRESH',w*.5,h*.54,w*.82);
    }});
    decal({plane:'front',x:.59,y:.80,width:.67,height:.67,angle:-.13,lift:.018,roughness:.62,draw(c,w,h){
      const rainbow=c.createLinearGradient(w*.05,h*.1,w*.95,h*.9);
      rainbow.addColorStop(0,'#d5e5df');rainbow.addColorStop(.22,'#ded4ed');rainbow.addColorStop(.43,'#e2e1b8');
      rainbow.addColorStop(.64,'#bddade');rainbow.addColorStop(.82,'#e8cdd3');rainbow.addColorStop(1,'#cdd4eb');
      c.fillStyle=rainbow;c.beginPath();
      for(let i=0;i<52;i++){
        const a=i/52*Math.PI*2-Math.PI/2,r=(i%2?.422:.472)*w;
        const px=w*.5+Math.cos(a)*r,py=h*.5+Math.sin(a)*r;
        if(i===0)c.moveTo(px,py);else c.lineTo(px,py);
      }
      c.closePath();c.fill();
      c.strokeStyle='rgba(48,62,81,.42)';c.lineWidth=3;c.beginPath();c.arc(w*.5,h*.5,w*.35,0,Math.PI*2);c.stroke();
      c.fillStyle='#26374a';c.textAlign='center';c.textBaseline='middle';
      c.font='900 242px "Arial Black",Arial,sans-serif';c.fillText('NEW',w*.5,h*.48,w*.75);
      c.font='600 69px Arial';c.fillText('2026',w*.5,h*.68);
    }});
  }
}
