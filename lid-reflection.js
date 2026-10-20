/*
 * Planar camera and oblique clipping adapted from three.js r160 Reflector:
 * https://github.com/mrdoob/three.js/blob/r160/examples/jsm/objects/Reflector.js
 *
 * The MIT License
 * Copyright © 2010-2023 three.js authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

export function createLidReflection({THREE,geometry,exclude=[]}){
  const target=new THREE.WebGLRenderTarget(512,256,{
    format:THREE.RGBAFormat,type:THREE.UnsignedByteType,
    minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
    depthBuffer:true,stencilBuffer:false,generateMipmaps:false
  });
  target.texture.name='Lid reflection';
  target.texture.colorSpace=THREE.LinearSRGBColorSpace;
  const projection=new THREE.Matrix4(),plane=new THREE.Plane();
  const normal=new THREE.Vector3(),point=new THREE.Vector3(),eye=new THREE.Vector3();
  const reflectedEye=new THREE.Vector3(),look=new THREE.Vector3(),reflectedLook=new THREE.Vector3();
  const normalMatrix=new THREE.Matrix3(),rotation=new THREE.Matrix4();
  const clip=new THREE.Vector4(),q=new THREE.Vector4(),viewport=new THREE.Vector4();
  const size=new THREE.Vector2(),mirrorCamera=new THREE.PerspectiveCamera();
  const material=new THREE.ShaderMaterial({
    name:'SoftLidReflection',transparent:true,depthWrite:false,depthTest:true,
    side:THREE.FrontSide,blending:THREE.NormalBlending,toneMapped:true,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    uniforms:{
      reflection:{value:target.texture},textureMatrix:{value:projection},
      opacity:{value:.38},blurStep:{value:new THREE.Vector2(.003,.004)}
    },
    vertexShader:`
      uniform mat4 textureMatrix;
      varying vec4 mirrorUv;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){
        mirrorUv=textureMatrix*vec4(position,1.0);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader:`
      uniform sampler2D reflection;
      uniform float opacity;
      uniform vec2 blurStep;
      varying vec4 mirrorUv;
      #include <logdepthbuf_pars_fragment>
      void main(){
        #include <logdepthbuf_fragment>
        vec2 uv=mirrorUv.xy/mirrorUv.w;
        if(mirrorUv.w<=0.0||any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))discard;
        vec4 reflected=texture2D(reflection,uv)*.40;
        reflected+=texture2D(reflection,uv+vec2(blurStep.x,0.0))*.15;
        reflected+=texture2D(reflection,uv-vec2(blurStep.x,0.0))*.15;
        reflected+=texture2D(reflection,uv+vec2(0.0,blurStep.y))*.15;
        reflected+=texture2D(reflection,uv-vec2(0.0,blurStep.y))*.15;
        if(reflected.a<.001)discard;
        // The transparent capture and blur are premultiplied; normal blending
        // needs straight RGB so the parcel's edge does not acquire a dark halo.
        gl_FragColor=vec4(reflected.rgb/max(reflected.a,.001),reflected.a*opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='LidReflection';mesh.renderOrder=1;mesh.castShadow=false;mesh.receiveShadow=false;
  mesh.frustumCulled=false;
  let capturing=false,checkedType=false;
  mesh.onBeforeRender=(renderer,scene,camera)=>{
    if(capturing||material.uniforms.opacity.value<=.001)return;
    point.setFromMatrixPosition(mesh.matrixWorld);eye.setFromMatrixPosition(camera.matrixWorld);
    normalMatrix.getNormalMatrix(mesh.matrixWorld);normal.set(0,0,1).applyNormalMatrix(normalMatrix);
    reflectedEye.subVectors(point,eye);
    if(reflectedEye.dot(normal)>=-.0001)return;
    reflectedEye.reflect(normal).negate().add(point);
    rotation.extractRotation(camera.matrixWorld);
    look.set(0,0,-1).applyMatrix4(rotation).add(eye);
    reflectedLook.subVectors(point,look).reflect(normal).negate().add(point);
    mirrorCamera.position.copy(reflectedEye);
    mirrorCamera.up.set(0,1,0).applyMatrix4(rotation).reflect(normal);
    mirrorCamera.lookAt(reflectedLook);mirrorCamera.near=camera.near;mirrorCamera.far=camera.far;
    mirrorCamera.layers.mask=camera.layers.mask;mirrorCamera.updateMatrixWorld();
    // Copy the complete projection, including the main camera's view offset.
    mirrorCamera.projectionMatrix.copy(camera.projectionMatrix);
    projection.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
    projection.multiply(mirrorCamera.projectionMatrix).multiply(mirrorCamera.matrixWorldInverse).multiply(mesh.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(normal,point);
    plane.constant-=.003; // Clip the steel and its coplanar contact-shadow layer.
    plane.applyMatrix4(mirrorCamera.matrixWorldInverse);
    clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
    const p=mirrorCamera.projectionMatrix.elements;
    q.set((Math.sign(clip.x)+p[8])/p[0],(Math.sign(clip.y)+p[9])/p[5],-1,(1+p[10])/p[14]);
    const denominator=clip.dot(q);
    if(Math.abs(denominator)<.000001)return;
    clip.multiplyScalar(2/denominator);
    p[2]=clip.x;p[6]=clip.y;p[10]=clip.z+1;p[14]=clip.w;
    mirrorCamera.projectionMatrixInverse.copy(mirrorCamera.projectionMatrix).invert();
    if(!checkedType){
      const halfFloat=renderer.extensions.has('EXT_color_buffer_float')||renderer.extensions.has('EXT_color_buffer_half_float');
      target.texture.type=halfFloat?THREE.HalfFloatType:THREE.UnsignedByteType;checkedType=true;
    }
    renderer.getSize(size);const width=size.x<=700?256:512;
    if(target.width!==width)target.setSize(width,width/2);
    const previousTarget=renderer.getRenderTarget(),cubeFace=renderer.getActiveCubeFace(),mipLevel=renderer.getActiveMipmapLevel();
    const xr=renderer.xr.enabled,shadowAuto=renderer.shadowMap.autoUpdate,shadowNeeds=renderer.shadowMap.needsUpdate;
    const alpha=renderer.getClearAlpha(),autoClear=renderer.autoClear,visible=mesh.visible;
    renderer.getCurrentViewport(viewport);
    const excludedVisibility=exclude.map(object=>object.visible);
    capturing=true;mesh.visible=false;
    // The clip plane already removes these surfaces. Skip their draw submission
    // as well, without changing the parcel reflected above the lid.
    for(const object of exclude)object.visible=false;
    try{
      renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
      renderer.autoClear=false;renderer.setClearAlpha(0);
      // setRenderTarget uses the target's viewport/scissor without changing the
      // renderer's user viewport, clear colour, tone mapping or scene background.
      renderer.setRenderTarget(target);renderer.state.buffers.depth.setMask(true);
      renderer.clear(true,true,false);renderer.render(scene,mirrorCamera);
    }finally{
      renderer.xr.enabled=xr;renderer.shadowMap.autoUpdate=shadowAuto;renderer.shadowMap.needsUpdate=shadowNeeds;
      renderer.autoClear=autoClear;renderer.setClearAlpha(alpha);
      renderer.setRenderTarget(previousTarget,cubeFace,mipLevel);renderer.state.viewport(viewport);
      exclude.forEach((object,i)=>{object.visible=excludedVisibility[i];});
      mesh.visible=visible;capturing=false;
    }
  };
  mesh.getRenderTarget=()=>target;
  mesh.dispose=()=>{target.dispose();material.dispose();};
  return mesh;
}
