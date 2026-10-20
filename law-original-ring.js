// Original raster layers reprojected through their calibrated camera plane.
// No replacement sculpture or new foreground design is created.
export const COVER_CYCLE=Object.freeze({duration:10,maxArtworkTime:2.1,backAngleDegrees:.7});

// Continuous, bounded movement: no held frames and no accumulated rotation.
export function sampleCoverCycle(time){
  const phase=((time%COVER_CYCLE.duration)+COVER_CYCLE.duration)%COVER_CYCLE.duration;
  const progress=.5-.5*Math.cos(phase/COVER_CYCLE.duration*Math.PI*2);
  const stage=phase<COVER_CYCLE.duration/2?'forward':'return';
  return {phase,progress,stage,artworkTime:progress*COVER_CYCLE.maxArtworkTime,
    cycle:Math.floor(Math.max(0,time)/COVER_CYCLE.duration)};
}

// The central assembly floats as one uncut original image. Detached side
// blocks share that movement and add their own independent lift.
export const CORE_FLOAT=Object.freeze({amplitude:24,period:6.8});
export function sampleCoreFloat(time){
  return -CORE_FLOAT.amplitude*Math.sin(Math.PI*time/CORE_FLOAT.period)**2;
}
export const CUBE_FLOAT=Object.freeze([
  {name:'cube-right',amplitude:28,period:3.8},
  {name:'cube-front',amplitude:36,period:4.6}
]);
export function sampleCubeFloat(time){
  const coreY=sampleCoreFloat(time);
  return CUBE_FLOAT.map(piece=>({...piece,y:coreY-piece.amplitude*Math.sin(Math.PI*time/piece.period)**2}));
}

export async function createOriginalRingRenderer(THREE, config, projection, lightConfig, folder) {
  const renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,powerPreference:'low-power'});
  renderer.setClearColor(0x000000,1);
  renderer.toneMapping=THREE.NoToneMapping;
  const canvas=renderer.domElement;
  canvas.className='law-motion-canvas'; canvas.setAttribute('aria-hidden','true');
  const names=['base','back-orbit-padded','track','cube-static','lettering','track-light',...CUBE_FLOAT.map(piece=>piece.name)];
  const textures={};
  await Promise.all(names.map(async name=>{
    const assetURL=new URL(name+'.webp',folder);
    assetURL.searchParams.set('v','20261018-rigid-core-and-side-float');
    const texture=await new THREE.TextureLoader().loadAsync(assetURL.href);
    texture.flipY=false; texture.colorSpace=THREE.NoColorSpace;
    texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
    texture.generateMipmaps=false;
    if (name.endsWith('-light')) texture.wrapS=THREE.RepeatWrapping;
    texture.needsUpdate=true;textures[name]=texture;
  }));
  const scene=new THREE.Scene(), camera=new THREE.Camera();
  const resolution=new THREE.Vector2(config.width,config.height);
  const matrix=rows=>new THREE.Matrix3().set(...rows.flat());
  const sourceToCover=matrix([...config.matrix,[0,0,1]]);
  const homography=matrix(projection.homography), inverseH=matrix(projection.inverseHomography);
  const coverH=new THREE.Matrix3().multiplyMatrices(sourceToCover,homography);
  const inverseCoverH=coverH.clone().invert();
  const [[a,b],[c,d]]=config.ellipse, det=a*d-b*c;
  const inverseE=new THREE.Vector4(d/det,-b/det,-c/det,a/det);
  const center=new THREE.Vector2(...config.center);
  const materials=[], geometries=[];
  const quadGeometry=new THREE.BufferGeometry();
  quadGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,1,0,1,1,0,-1,-1,0,1,-1,0],3));
  quadGeometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));
  quadGeometry.setIndex([0,2,1,2,3,1]);geometries.push(quadGeometry);
  function plate(texture,order,projective=false) {
    const material=new THREE.RawShaderMaterial({
      uniforms:{uTexture:{value:texture},uShift:{value:new THREE.Vector2()},uResolution:{value:resolution},
        uArtworkSize:{value:new THREE.Vector2(texture.image.width,texture.image.height)},
        uArtworkOrigin:{value:new THREE.Vector2((texture.image.width-config.width)/2,(texture.image.height-config.height)/2)},
        uCoverH:{value:coverH},uInverseCoverH:{value:inverseCoverH},uAngle:{value:0}},
      vertexShader:projective?`precision highp float;
        attribute vec3 position; attribute vec2 uv;
        uniform mat3 uCoverH;uniform mat3 uInverseCoverH;
        uniform vec2 uShift;uniform vec2 uResolution;uniform float uAngle;
        uniform vec2 uArtworkSize;uniform vec2 uArtworkOrigin;
        varying vec2 vUv;
        void main(){
          vUv=uv;
          // Rotate in the original track plane, keeping the photographed
          // ellipse and its perspective. Homogeneous clip.w preserves UVs.
          vec3 local=uInverseCoverH*vec3(uv*uArtworkSize-uArtworkOrigin,1.0);
          float co=cos(uAngle),si=sin(uAngle);
          local.xy=mat2(co,si,-si,co)*local.xy;
          vec3 projected=uCoverH*local;
          projected.xy+=uShift*projected.z;
          gl_Position=vec4(2.0*projected.x/uResolution.x-projected.z,
            projected.z-2.0*projected.y/uResolution.y,0.0,projected.z);
        }`:`precision highp float;
        attribute vec3 position; attribute vec2 uv;
        uniform vec2 uShift;uniform vec2 uResolution;varying vec2 vUv;
        void main(){vUv=uv;gl_Position=vec4(position.xy+vec2(uShift.x,-uShift.y)/uResolution*2.0,0.0,1.0);}`,
      fragmentShader:`precision highp float;
        uniform sampler2D uTexture;varying vec2 vUv;
        void main(){gl_FragColor=texture2D(uTexture,vUv);}`,
      transparent:order!==0,depthTest:false,depthWrite:false,toneMapped:false
    });
    const mesh=new THREE.Mesh(quadGeometry,material);mesh.frustumCulled=false;mesh.renderOrder=order;
    materials.push(material);scene.add(mesh);return material;
  }
  plate(textures.base,0);
  const backOrbit=plate(textures['back-orbit-padded'],.5,true);
  const ringVertex=`precision highp float;
    attribute vec2 sourcePoint;attribute float surfaceDepth;
    uniform mat3 uH;uniform mat3 uInverseH;uniform mat3 uSourceToCover;
    uniform vec2 uExtrusion;uniform vec2 uResolution;uniform vec2 uSourceSize;
    uniform float uAngle;
    varying vec2 vUv;varying vec2 vOriginal;varying vec2 vProjected;
    void main(){
      // Keep the side-face displacement in camera space. It must not rotate
      // or flatten with the top-face artwork.
      vec2 lifted=sourcePoint-surfaceDepth*uExtrusion;
      vec3 local=uInverseH*vec3(lifted,1.0);
      vec2 q=local.xy/local.z;
      float co=cos(uAngle),si=sin(uAngle);
      q=mat2(co,si,-si,co)*q;
      vec3 projected=uH*vec3(q,1.0);
      vec2 finalPoint=projected.xy/projected.z+surfaceDepth*uExtrusion;
      vec3 cover=uSourceToCover*vec3(finalPoint,1.0);
      gl_Position=vec4(cover.x/uResolution.x*2.0-1.0,1.0-cover.y/uResolution.y*2.0,
        -.15-cover.y/uResolution.y*.15-surfaceDepth*.02,1.0);
      vUv=sourcePoint/uSourceSize;vOriginal=sourcePoint;vProjected=finalPoint;
    }`;
  const ringFragment=`precision highp float;
    uniform sampler2D uTexture;uniform sampler2D uLight;
    uniform vec2 uCenter;uniform vec4 uInverseE;uniform vec2 uRange;
    varying vec2 vUv;varying vec2 vOriginal;varying vec2 vProjected;
    vec2 lightUV(vec2 point){
      vec2 p=point-uCenter;
      vec2 q=vec2(dot(uInverseE.xy,p),dot(uInverseE.zw,p));
      float theta=atan(q.y,q.x)/6.28318530718;
      float r=clamp((length(q)-uRange.x)/(uRange.y-uRange.x),0.0,1.0);
      return vec2(fract(theta+.5/512.0),.5/128.0+r*127.0/128.0);
    }
    void main(){
      vec4 pixel=texture2D(uTexture,vUv);
      if(pixel.a<.005)discard;
      // Original reflections stay in the viewing direction while the seams
      // travel around the track. Rotating the baked light made it look flat.
      vec3 before=texture2D(uLight,lightUV(vOriginal)).rgb;
      vec3 fixedLight=texture2D(uLight,lightUV(vProjected)).rgb;
      vec3 ratio=clamp((fixedLight+.025)/(before+.025),vec3(.12),vec3(5.0));
      gl_FragColor=vec4(clamp(pixel.rgb*mix(vec3(1.0),ratio,.97),0.0,1.0),pixel.a);
    }`;
  const smooth=(x,lo,hi)=>{const s=Math.max(0,Math.min(1,(x-lo)/(hi-lo)));return s*s*(3-2*s);};
  const rings=[];
  function addRing(name,extrusion,speed,order) {
    const range=lightConfig.layers[name];
    const material=new THREE.RawShaderMaterial({
      uniforms:{
        uTexture:{value:textures[name]},uLight:{value:textures[name+'-light']},
        uH:{value:homography},uInverseH:{value:inverseH},uSourceToCover:{value:sourceToCover},
        uResolution:{value:resolution},uSourceSize:{value:new THREE.Vector2(config.sourceWidth,config.sourceHeight)},
        uAngle:{value:0},uExtrusion:{value:new THREE.Vector2(...extrusion)},
        uCenter:{value:center},uInverseE:{value:inverseE},uRange:{value:new THREE.Vector2(range.rMin,range.rMax)}
      },
      vertexShader:ringVertex,fragmentShader:ringFragment,
      transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
    });
    const nx=160,ny=128;
    const rx=Math.hypot(a,b)*1.15,ry=Math.hypot(c,d)*1.15;
    const points=[],depth=[],indices=[];
    const planePoint=new THREE.Vector3();
    for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
      const px=config.center[0]-rx+2*rx*x/nx, py=config.center[1]-ry+2*ry*y/ny;
      points.push(px,py);
      // Solve the height in the shared camera plane, not the old affine
      // ellipse. An axisymmetric depth profile keeps its section on every turn.
      let z=0;
      for(let k=0;k<18;k++){
        planePoint.set(px-z*extrusion[0],py-z*extrusion[1],1).applyMatrix3(inverseH);
        const radius=Math.hypot(planePoint.x/planePoint.z,planePoint.y/planePoint.z);
        // The original annulus is one continuous object. A shared smooth depth
        // profile prevents independent masks from tearing its continuous wall.
        const candidate=smooth(radius,.96,1.025)+1-smooth(radius,.59,.77);
        z=.4*z+.6*candidate;
      }
      depth.push(z);
    }
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
      const i=y*(nx+1)+x;
      indices.push(i,i+nx+1,i+1,i+1,i+nx+1,i+nx+2);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('sourcePoint',new THREE.Float32BufferAttribute(points,2));
    geometry.setAttribute('surfaceDepth',new THREE.Float32BufferAttribute(depth,1));
    geometry.setIndex(indices);geometries.push(geometry);materials.push(material);
    const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=order;
    scene.add(mesh);rings.push({material,speed});
  }
  addRing('track',[6,14],.145,1);
  const cubeCore=plate(textures['cube-static'],3);
  const cubes=CUBE_FLOAT.map((piece,index)=>plate(textures[piece.name],3.1+index*.1));
  plate(textures.lettering,4);
  return {
    canvas,
    size(width,height){
      renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5,1800/Math.max(width,1)));
      renderer.setSize(width,height,false);
    },
    render(time){
      const cycle=sampleCoverCycle(time),artworkTime=cycle.artworkTime;
      const backOrbitY=-10*cycle.progress;
      backOrbit.uniforms.uShift.value.set(0,backOrbitY);
      const backAngle=COVER_CYCLE.backAngleDegrees*cycle.progress;
      backOrbit.uniforms.uAngle.value=backAngle*Math.PI/180;
      for(const ring of rings)ring.material.uniforms.uAngle.value=artworkTime*ring.speed;
      const coreY=sampleCoreFloat(time);
      cubeCore.uniforms.uShift.value.set(0,coreY);
      const cubeOffsets=sampleCubeFloat(time);
      cubeOffsets.forEach((piece,index)=>cubes[index].uniforms.uShift.value.set(0,piece.y));
      renderer.render(scene,camera);
      return {...cycle,angle:artworkTime*.145*180/Math.PI,backOrbitY,backAngle,coreY,cubeOffsets};
    },
    dispose(){
      materials.forEach(item=>item.dispose());geometries.forEach(item=>item.dispose());
      Object.values(textures).forEach(item=>item.dispose());renderer.dispose();
    }
  };
}

