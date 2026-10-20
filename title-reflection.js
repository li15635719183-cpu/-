// Rasterise the real DOM title once per layout update. The metal shader can
// intersect its reflected world ray with this fixed, virtual title plane.
export function createTitleReflection({THREE,heading}){
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=256;
  const context=canvas.getContext('2d');
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;
  map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;map.anisotropy=4;
  map.name='DOM title reflection';
  const uniforms={
    titleReflectionMap:{value:map},
    titleOrigin:{value:new THREE.Vector3()},
    titleRight:{value:new THREE.Vector3(1,0,0)},
    titleDown:{value:new THREE.Vector3(0,-1,0)},
    titleNormal:{value:new THREE.Vector3(0,0,1)},
    titleReveal:{value:0}
  };
  function paint(){
    const rect=heading.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return null;
    canvas.width=2048;canvas.height=Math.max(1,Math.round(2048*rect.height/rect.width));
    const scale=canvas.width/rect.width;context.clearRect(0,0,canvas.width,canvas.height);
    context.scale(scale,scale);context.textAlign='left';context.textBaseline='alphabetic';
    // Range positions preserve the browser's tracking, kerning and wrapping,
    // while per-character canvas drawing also works with negative spacing.
    const allSpans=Array.from(heading.querySelectorAll('span'));
    const spans=allSpans.length?allSpans.filter(span=>!span.querySelector('span')):[heading];
    for(const span of spans){
      const style=getComputedStyle(span),fontSize=parseFloat(style.fontSize)||16;
      const tracking=style.letterSpacing==='normal'?0:parseFloat(style.letterSpacing)||0;
      context.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.fillStyle=style.color;
      const metrics=context.measureText('Mg');
      const ascent=metrics.fontBoundingBoxAscent??metrics.actualBoundingBoxAscent??fontSize*.8;
      const descent=metrics.fontBoundingBoxDescent??metrics.actualBoundingBoxDescent??fontSize*.2;
      const walker=document.createTreeWalker(span,4),range=document.createRange();
      let node;
      while((node=walker.nextNode())){
        let offset=0,fallbackX=span.getBoundingClientRect().left;
        for(const character of Array.from(node.nodeValue||'')){
          range.setStart(node,offset);offset+=character.length;range.setEnd(node,offset);
          const bounds=range.getBoundingClientRect();
          const text=style.textTransform==='uppercase'?character.toUpperCase():style.textTransform==='lowercase'?character.toLowerCase():character;
          if(bounds.height>0){
            const baseline=bounds.top-rect.top+(bounds.height-ascent-descent)/2+ascent;
            context.fillText(text,bounds.left-rect.left,baseline);
          }else if(text.trim()){
            context.fillText(text,fallbackX-rect.left,ascent);
          }
          fallbackX=(bounds.width>0?bounds.right:fallbackX+context.measureText(text).width+tracking);
        }
      }
    }
    map.needsUpdate=true;return rect;
  }
  function update(camera,{width,height}){
    if(!heading||width<=0||height<=0)return;
    const rect=paint();if(!rect)return;
    // A typographic studio card hangs over the curved barrel. Its larger
    // vertical extent compensates for the severe compression at grazing angles.
    // Only the reflected view ray sees this card; it adds no draw pass.
    uniforms.titleOrigin.value.set(3,6,2);
    uniforms.titleRight.value.set(0,0,-10);
    uniforms.titleDown.value.set(-14,0,0);
    uniforms.titleNormal.value.set(0,-1,0);
  }
  return {uniforms,update};
}
