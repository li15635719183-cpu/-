(() => {
  'use strict';
  const covers=[...document.querySelectorAll('[data-law-motion]')];
  if(!covers.length)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const folder=new URL('./assets/law-ai/motion/',document.currentScript.src);
  const controllers=[];
  let source;
  const getJSON=name=>fetch(new URL(name,folder)).then(response=>{
    if(!response.ok)throw new Error('Original motion asset unavailable');
    return response.json();
  });
  const loadSource=()=>source ||= Promise.all([
    import('./assets/vendor/three.module.js'),import('./law-original-ring.js'),
    getJSON('layers.json'),getJSON('perspective.json'),getJSON('ring-lightmaps.json')
  ]);
  class OriginalCover {
    constructor(element){
      this.element=element;this.visible=false;this.time=0;this.frame=0;
      element.dataset.motionState='static';
      element.dataset.motionRenderer='original-continuous-track';
      element.dataset.motionMode='continuous-short-cycle';
      element.dataset.motionCoreRig='ai-cap-support-body-together';
      this.observer=new IntersectionObserver(entries=>{
        this.visible=entries[0].isIntersecting;void this.sync();
      });this.observer.observe(element);
      this.resize=new ResizeObserver(()=>{
        if(this.view){this.view.size(element.clientWidth,element.clientHeight);this.view.render(this.time);}
        void this.sync();
      });this.resize.observe(element);
    }
    allowed(){
      return !reduced.matches&&!document.hidden&&!document.querySelector('dialog[open]')
        &&!document.documentElement.classList.contains('case-viewer-open');
    }
    prepare(){
      return this.loading ||= loadSource().then(async([THREE,module,config,projection,light])=>{
        this.view=await module.createOriginalRingRenderer(THREE,config,projection,light,folder);
        this.view.canvas.addEventListener('webglcontextlost',event=>{
          event.preventDefault();this.fail();
        });
        this.element.append(this.view.canvas);
        this.view.size(this.element.clientWidth,this.element.clientHeight);
        this.view.render(this.time);this.ready=true;
      }).catch(error=>this.fail(error));
    }
    async sync(){
      if(!this.visible||!this.allowed()||this.failed){this.stop();return;}
      await this.prepare();
      if(!this.visible||!this.allowed()||!this.ready||this.failed)return;
      if(!this.frame){
        this.last=performance.now();
        this.frame=requestAnimationFrame(time=>this.draw(time));
      }
    }
    draw(now){
      this.frame=0;
      if(!this.visible||!this.allowed()||!this.ready){this.stop();return;}
      this.time+=Math.min(.08,Math.max(0,(now-this.last)/1000));this.last=now;
      const cycle=this.view.render(this.time);
      this.element.classList.add('is-law-running');
      this.element.dataset.motionState='auto';
      this.element.dataset.motionStage=cycle.stage;
      this.element.dataset.motionCycle=String(cycle.cycle);
      if(!this.reported||this.time-this.reported>.5){
        this.element.dataset.motionTime=this.time.toFixed(2);
        this.element.dataset.motionAngle=cycle.angle.toFixed(1);
        this.element.dataset.motionPhase=cycle.phase.toFixed(2);
        this.element.dataset.motionBackOffset=cycle.backOrbitY.toFixed(1);
        this.element.dataset.motionBackAngle=cycle.backAngle.toFixed(2);
        this.element.dataset.motionCubeOffsets=cycle.cubeOffsets.map(piece=>piece.y.toFixed(1)).join(',');
        this.element.dataset.motionCoreOffset=cycle.coreY.toFixed(1);
        this.reported=this.time;
      }
      this.frame=requestAnimationFrame(time=>this.draw(time));
    }
    stop(){
      if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;
      this.element.classList.remove('is-law-running');
      this.element.dataset.motionState=this.failed?'fallback':'static';
    }
    fail(error){
      this.failed=true;this.ready=false;this.stop();
      if(error)this.element.dataset.motionError=error.message;
      this.view?.canvas.remove();this.view?.dispose();
    }
  }
  covers.forEach(element=>controllers.push(new OriginalCover(element)));
  const syncAll=()=>controllers.forEach(controller=>void controller.sync());
  document.addEventListener('visibilitychange',syncAll);
  window.addEventListener('focus',syncAll);
  window.addEventListener('pageshow',syncAll);
  window.addEventListener('pagehide',()=>controllers.forEach(controller=>controller.stop()));
  reduced.addEventListener('change',syncAll);
  new MutationObserver(syncAll).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  document.querySelectorAll('dialog').forEach(dialog=>new MutationObserver(syncAll)
    .observe(dialog,{attributes:true,attributeFilter:['open']}));
})();
