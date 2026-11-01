export const gameClientKit=String.raw`
export function createInput(target,{capturePointer=false,preventContextMenu=true}={}){
 const down=new Set(),pressed=new Set(),released=new Set(),pointer={x:0,y:0,dx:0,dy:0},listeners=[];
 const on=(node,type,handler,options)=>{node.addEventListener(type,handler,options);listeners.push(()=>node.removeEventListener(type,handler,options));};
 const clear=()=>{for(const code of down)released.add(code);down.clear();pressed.clear();pointer.dx=pointer.dy=0;};
 const editable=node=>node?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(node?.tagName);
 on(target,'keydown',event=>{if(editable(event.target))return;event.preventDefault();if(!down.has(event.code))pressed.add(event.code);down.add(event.code);});
 on(target,'keyup',event=>{down.delete(event.code);released.add(event.code);});
 on(target,'pointerdown',event=>{if(editable(event.target))return;target.focus();const code='Mouse'+event.button;if(!down.has(code))pressed.add(code);down.add(code);if(capturePointer&&document.pointerLockElement!==target)target.requestPointerLock?.();});
 on(window,'pointerup',event=>{const code='Mouse'+event.button;down.delete(code);released.add(code);});
 on(target,'pointermove',event=>{const rect=target.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.y=event.clientY-rect.top;pointer.dx+=event.movementX||0;pointer.dy+=event.movementY||0;});
 on(target,'blur',clear);on(window,'blur',clear);on(document,'visibilitychange',()=>{if(document.hidden)clear();});on(document,'pointerlockchange',clear);
 if(preventContextMenu)on(target,'contextmenu',event=>event.preventDefault());
 if(target.tabIndex<0)target.tabIndex=0;
 return {down,pressed,released,pointer,axis:(negative,positive)=>Number(down.has(positive))-Number(down.has(negative)),endFrame(){pressed.clear();released.clear();pointer.dx=pointer.dy=0;},dispose(){clear();for(const remove of listeners)remove();if(document.pointerLockElement===target)document.exitPointerLock();}};
}
export function createLoop({update,render,fixedStep=1/60,maxSteps=5}){
 if(typeof update!=='function'||typeof render!=='function'||!Number.isFinite(fixedStep)||fixedStep<=0||!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>20)throw Error('游戏循环参数无效');
 let active=false,paused=false,frame=0,last=0,accumulator=0;
 const tick=now=>{if(!active)return;const dt=last?Math.min(.1,Math.max(0,(now-last)/1000)):0;last=now;if(!paused&&!document.hidden){accumulator+=dt;let steps=0;while(accumulator>=fixedStep&&steps++<maxSteps){update(fixedStep);accumulator-=fixedStep;}if(steps>maxSteps)accumulator=0;render(accumulator/fixedStep,dt);}frame=requestAnimationFrame(tick);};
 return {start(){if(active)return;active=true;last=0;frame=requestAnimationFrame(tick);},pause(value=true){paused=value;last=0;accumulator=0;},stop(){active=false;cancelAnimationFrame(frame);last=0;accumulator=0;}};
}
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const lerp=(a,b,t)=>a+(b-a)*t;
export function normalize2(x,y){const length=Math.hypot(x,y);return length?[x/length,y/length]:[0,0];}
export function overlaps2(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
export function overlaps3(a,b){return ['x','y','z'].every(axis=>Math.abs(a.position[axis]-b.position[axis])*2<a.size[axis]+b.size[axis]);}
export function moveBody2(body,dx,dy,solids){
 const distance=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(distance/Math.max(1,Math.min(body.width,body.height)*.5)));
 if(!Number.isFinite(distance)||steps>128)throw Error('移动步长超出预算');
 for(let i=0;i<steps;i++){body.x+=dx/steps;for(const solid of solids)if(overlaps2(body,solid))body.x=dx>0?solid.x-body.width:dx<0?solid.x+solid.width:body.x;body.y+=dy/steps;for(const solid of solids)if(overlaps2(body,solid))body.y=dy>0?solid.y-body.height:dy<0?solid.y+solid.height:body.y;}return body;
}
export function createCooldowns(){const timers=new Map();return {tick(dt){if(!Number.isFinite(dt)||dt<0)throw Error('冷却步长无效');for(const [key,value]of timers){if(value<=dt)timers.delete(key);else timers.set(key,value-dt);}},ready:key=>!timers.has(key),remaining:key=>timers.get(key)||0,use(key,duration){if(!Number.isFinite(duration)||duration<0)throw Error('冷却时长无效');if(timers.has(key))return false;if(duration)timers.set(key,duration);return true;},clear(){timers.clear();}};}
export function createEvents(){const handlers=new Map();return {on(name,handler){if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(handler);return ()=>handlers.get(name)?.delete(handler);},emit(name,data){for(const handler of handlers.get(name)||[])handler(data);},clear(){handlers.clear();}};}
export function createStateMachine(states,initial){let current;const change=next=>{if(!Object.hasOwn(states,next))throw Error('状态不存在');if(current===next)return;states[current]?.exit?.();current=next;states[current]?.enter?.();};change(initial);return {get current(){return current;},change,update:dt=>states[current]?.update?.(dt)};}
export function interactionTarget(position,targets,range){return targets.filter(target=>target.enabled!==false&&Math.hypot(target.x-position.x,target.y-position.y)<=range).sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.y)-Math.hypot(b.x-position.x,b.y-position.y))[0]||null;}
`;
