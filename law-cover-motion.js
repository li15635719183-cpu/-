(() => {
  'use strict';
  const scriptURL=document.currentScript.src;
  const folder=new URL('./assets/law-ai/motion/',scriptURL);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const members=new Map();
  let source,view,loading,frame=0,last=0,time=0,retries=0,retryTimer=0;
  const runtimeURL='./assets/entry/law-motion.c09b8ad3daf3.js';
  const manifestURL='assets.7b65554f380f.json';
  const getJSON=async name=>{
    let error;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const url=new URL(name,folder);
        if(attempt)url.searchParams.set('retry',String(attempt));
        const response=await fetch(url);
        if(!response.ok)throw new Error('Motion asset unavailable: '+response.status);
        return await response.json();
      }catch(cause){error=cause;}
    }
    throw error;
  };
  function allowed(){
    return !reduced.matches&&!document.hidden&&!document.querySelector('dialog[open]')
      &&!document.documentElement.classList.contains('case-viewer-open');
  }
  const visibleMembers=()=>[...members.values()].filter(member=>member.visible&&member.element.isConnected);
  async function prepare(){
    if(view)return view;
    if(loading)return loading;
    loading=(async()=>{
      source ||= Promise.all([import(runtimeURL),getJSON('layers.json'),getJSON('perspective.json'),getJSON('ring-lightmaps.json'),getJSON(manifestURL)]);
      const [runtime,config,projection,light,assets]=await source;
      view=await runtime.createCover(config,projection,light,folder,assets);
      view.canvas.addEventListener('webglcontextlost',event=>{
        event.preventDefault();view.dispose();view=null;loading=null;source=null;retries=0;void sync();
      });
      retries=0;
      return view;
    })().catch(error=>{
      loading=null;source=null;
      for(const member of members.values()){
        member.element.dataset.motionState='loading';
        member.element.dataset.motionError=error.message;
      }
      if(retries++<2&&!retryTimer)retryTimer=setTimeout(()=>{retryTimer=0;void sync();},1200);
      return null;
    });
    return loading;
  }
  function stop(){
    cancelAnimationFrame(frame);frame=0;last=0;
    for(const member of members.values()){
      if(!member.visible||!allowed())member.element.classList.remove('is-law-running');
    }
  }
  function draw(now){
    frame=0;
    const visible=visibleMembers();
    if(!view||!allowed()||!visible.length){stop();return;}
    time+=last?Math.min(.08,Math.max(0,(now-last)/1000)):0;last=now;
    const width=Math.max(...visible.map(member=>member.element.clientWidth));
    const height=Math.max(...visible.map(member=>member.element.clientHeight));
    if(width!==view.width||height!==view.height){view.size(width,height);view.width=width;view.height=height;}
    const cycle=view.render(time);
    for(const member of visible){
      if(!member.canvas){
        member.canvas=document.createElement('canvas');
        member.canvas.className='law-motion-canvas';member.canvas.setAttribute('aria-hidden','true');
        member.context=member.canvas.getContext('2d',{alpha:false});member.element.append(member.canvas);
      }
      const canvas=member.canvas;
      if(canvas.width!==view.canvas.width||canvas.height!==view.canvas.height){canvas.width=view.canvas.width;canvas.height=view.canvas.height;}
      member.context.drawImage(view.canvas,0,0);
      member.element.classList.add('is-law-running');
      member.element.dataset.motionState='auto';
      member.element.dataset.motionTime=time.toFixed(2);
      member.element.dataset.motionStage=cycle.stage;
      delete member.element.dataset.motionError;
    }
    frame=requestAnimationFrame(draw);
  }
  function wake(){if(!frame&&view&&allowed()&&visibleMembers().length)frame=requestAnimationFrame(draw);}
  async function sync(){
    if(!allowed()||!visibleMembers().length){stop();return;}
    await prepare();wake();
  }
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){const member=members.get(entry.target);if(member)member.visible=entry.isIntersecting;}
    void sync();
  });
  const nearObserver=new IntersectionObserver(entries=>{
    if(allowed()&&entries.some(entry=>entry.isIntersecting))void prepare().then(wake);
  },{rootMargin:'500px 300px'});
  function bind(){
    for(const [element,member] of members)if(!element.isConnected){observer.unobserve(element);nearObserver.unobserve(element);member.canvas?.remove();members.delete(element);}
    for(const element of document.querySelectorAll('[data-law-motion]')){
      if(members.has(element))continue;
      element.querySelectorAll('.law-motion-canvas').forEach(canvas=>canvas.remove());
      element.classList.remove('is-law-running');element.dataset.motionState='loading';
      members.set(element,{element,visible:false});observer.observe(element);nearObserver.observe(element);
    }
  }
  bind();
  new MutationObserver(records=>{
    if(records.some(record=>[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&(node.matches?.('[data-law-motion],.carousel-copy')||node.querySelector?.('[data-law-motion]')))))bind();
  }).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('focus',()=>{retries=0;void sync();});
  window.addEventListener('pageshow',sync);
  window.addEventListener('pagehide',stop);
  reduced.addEventListener('change',sync);
  new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  document.querySelectorAll('dialog').forEach(dialog=>new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']}));
})();
