export function formatGameLatency(milliseconds){
 if(!Number.isFinite(milliseconds)||milliseconds<0)return '连接中断';
 if(milliseconds<1000)return Math.round(milliseconds)+'ms';
 return (Math.round(milliseconds/100)/10).toString()+'s';
}
export const gameLatencyClient=String.raw`
const latencyHeadings=new Map();let latencyTimer=null,latencyBusy=false,latencyStopped=false,activeLatencyHeading=null;
function latencyLabel(ms){if(!Number.isFinite(ms)||ms<0)return '连接中断';return ms<1000?Math.round(ms)+'ms':(Math.round(ms/100)/10).toString()+'s';}
function registerLatencyHeading(heading,name){latencyHeadings.set(heading,name);heading.textContent=name+' - 测量中';const activate=()=>{activeLatencyHeading=heading;document.title=heading.textContent;};heading.parentElement.addEventListener('pointerdown',activate);heading.parentElement.addEventListener('focusin',activate);if(!activeLatencyHeading||!activeLatencyHeading.isConnected)activate();if(!latencyTimer){latencyTimer=setInterval(measureLatency,10000);measureLatency();}}
async function measureLatency(){
 if(latencyStopped||latencyBusy||document.hidden)return;
 if(!latencyHeadings.size)return;
 latencyBusy=true;let label;const started=performance.now();
 try{const response=await fetch('/api/ping',{cache:'no-store',signal:AbortSignal.timeout(9500)});if(!response.ok)throw Error('ping failed');await response.json();label=latencyLabel(performance.now()-started);}catch{label='连接中断';}
 finally{latencyBusy=false;}
 if(latencyStopped)return;
  for(const [heading,name]of latencyHeadings)heading.textContent=name+' - '+label;
  if(activeLatencyHeading)document.title=activeLatencyHeading.textContent;
}
window.addEventListener('pagehide',()=>{latencyStopped=true;clearInterval(latencyTimer);latencyHeadings.clear();},{once:true});
`;
