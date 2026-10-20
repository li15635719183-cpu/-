// Bare brushed steel. Colour comes from the studio reflections, without a
// tinted clear coat. Object-space grain keeps the rolled shell's brushing
// aligned along its length instead of following the extrusion's UV seams.
export function createMachinedMetal(THREE,grain,titleUniforms){
  const width=512,height=64,data=new Uint8Array(width*height*4);
  let seed=1927;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const lines=Array.from({length:128},()=>random());
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=x/4,i=Math.floor(u),f=u-i,s=f*f*(3-2*f);
    const line=lines[i]*(1-s)+lines[(i+1)%lines.length]*s;
    // Long, continuous hairlines with very slight variation along the stroke.
    const value=Math.round(128+(line-.5)*74+(random()-.5)*5+
      2*Math.sin(y/height*Math.PI*2+x*.09));
    const at=(y*width+x)*4;
    data[at]=data[at+1]=data[at+2]=value;data[at+3]=255;
  }
  const brushing=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
  brushing.colorSpace=THREE.NoColorSpace;
  brushing.wrapS=brushing.wrapT=THREE.RepeatWrapping;
  brushing.magFilter=THREE.LinearFilter;
  brushing.minFilter=THREE.LinearMipmapLinearFilter;
  brushing.generateMipmaps=true;
  brushing.anisotropy=Math.min(grain?.anisotropy||4,8);
  brushing.needsUpdate=true;

  const material=new THREE.MeshPhysicalMaterial({
    name:'Neutral brushed stainless steel',
    color:0xa8a9a6,metalness:1,roughness:.18,envMapIntensity:1.02,
    clearcoat:0,iridescence:0,dithering:true
  });
  material.onBeforeCompile=shader=>{
    shader.uniforms.machinedBrush={value:brushing};
    if(titleUniforms)Object.assign(shader.uniforms,titleUniforms);
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>',`#include <common>
        varying vec3 machinedPosition;
        varying vec3 machinedNormal;
        varying vec3 steelWorldPosition;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        machinedPosition=position;
        machinedNormal=normal;
        steelWorldPosition=(modelMatrix*vec4(position,1.0)).xyz;`);
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`#include <common>
        uniform sampler2D machinedBrush;
        varying vec3 machinedPosition;
        varying vec3 machinedNormal;
        varying vec3 steelWorldPosition;
        float machinedHeight(){
          vec3 weights=pow(abs(normalize(machinedNormal)),vec3(10.0));
          weights/=max(dot(weights,vec3(1.0)),.0001);
          vec3 p=machinedPosition;
          // Side and roof: strokes parallel to local Z. End plates: local Y.
          float side=texture2D(machinedBrush,p.yz*vec2(2.5,.16)).r;
          float roof=texture2D(machinedBrush,p.xz*vec2(2.5,.16)).r;
          float end=texture2D(machinedBrush,p.xy*vec2(2.5,.16)).r;
          return dot(vec3(side,roof,end),weights)-.5;
        }`)
      .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        float steelGrain=machinedHeight();
        roughnessFactor=clamp(roughnessFactor+steelGrain*.02,.15,.23);`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        // Derivative bump preserves the physical reflected light, rather than
        // drawing grey scratches into the metal's base colour.
        vec3 steelDx=dFdx(-vViewPosition),steelDy=dFdy(-vViewPosition);
        vec3 steelR1=cross(steelDy,normal),steelR2=cross(normal,steelDx);
        float steelDet=dot(steelDx,steelR1);
        vec2 steelSlope=vec2(dFdx(steelGrain),dFdy(steelGrain))*.000025;
        normal=normalize(max(abs(steelDet),1e-12)*normal-
          sign(steelDet)*(steelSlope.x*steelR1+steelSlope.y*steelR2));`);
    if(titleUniforms){
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>',`#include <common>
          uniform sampler2D titleReflectionMap;
          uniform vec3 titleOrigin,titleRight,titleDown,titleNormal;
          uniform float titleReveal;`)
        .replace('#include <lights_fragment_maps>',`#include <lights_fragment_maps>
          // Intersect the reflected view ray with the heading's world plane.
          // This changes with the curved roof and camera, rather than its UVs.
          float titleRoof=smoothstep(1.65,1.95,machinedPosition.y)*
            smoothstep(.22,.6,machinedNormal.y)*(1.0-smoothstep(.2,.5,abs(machinedNormal.z)));
          if(titleRoof*titleReveal>.001){
            vec3 titleRay=inverseTransformDirection(reflect(-geometryViewDir,geometryNormal),viewMatrix);
            float titleDenominator=dot(titleRay,titleNormal);
            if(abs(titleDenominator)>.001){
              float titleDistance=dot(titleOrigin-steelWorldPosition,titleNormal)/titleDenominator;
              vec3 titleHit=steelWorldPosition+titleRay*titleDistance-titleOrigin;
              vec2 titleUV=vec2(dot(titleHit,titleRight)/max(dot(titleRight,titleRight),.001),dot(titleHit,titleDown)/max(dot(titleDown,titleDown),.001));
              if(titleDistance>0.0&&all(greaterThanEqual(titleUV,vec2(0.0)))&&all(lessThanEqual(titleUV,vec2(1.0)))){
                vec4 titleInk=texture2D(titleReflectionMap,vec2(titleUV.x,1.0-titleUV.y),2.0);
                radiance+=titleInk.rgb*titleInk.a*titleRoof*titleReveal*.45;
              }
            }
          }`);
    }
  };
  material.customProgramCacheKey=()=> 'machined-steel-object-brush-title-v2';
  return material;
}
