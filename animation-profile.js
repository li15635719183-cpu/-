// Opt-in local QA: ?profile=1 publishes one completed motion to #scene.
// Render time measures CPU submission, not GPU execution.
export function createAnimationProfile(host,renderer){
  if(new URLSearchParams(location.search).get('profile')!=='1')return null;
  renderer.info.autoReset=false;
  let motion='',frames=[],previous=0,submitted=0;
  const percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return +(sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]||0).toFixed(2);};
  return {
    start(name){motion=name;frames=[];previous=0;},
    before(now){if(!motion)return;if(previous)frames.push({interval:now-previous});previous=now;renderer.info.reset();submitted=performance.now();},
    after(done){
      if(!motion)return;
      const current=frames[frames.length-1];
      if(current){current.cpu=performance.now()-submitted;current.draws=renderer.info.render.calls;current.triangles=renderer.info.render.triangles;}
      if(!done)return;
      const intervals=frames.map(f=>f.interval);
      host.dataset.animationProfile=JSON.stringify({motion,frames:frames.length,medianMs:percentile(intervals,.5),p95Ms:percentile(intervals,.95),maxMs:percentile(intervals,1),over33:intervals.filter(v=>v>33.5).length,over50:intervals.filter(v=>v>50.5).length,cpuP95Ms:percentile(frames.map(f=>f.cpu),.95),drawsMax:Math.max(0,...frames.map(f=>f.draws)),trianglesMax:Math.max(0,...frames.map(f=>f.triangles))});
      motion='';
    }
  };
}
