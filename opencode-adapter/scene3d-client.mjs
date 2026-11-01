export const scene3DClient=String.raw`
function scene3DUI(scene,section){
 const canvas=document.createElement('canvas');canvas.width=720;canvas.height=420;canvas.setAttribute('aria-label','3D场景，拖动旋转，滚轮缩放');const context=canvas.getContext('2d');if(!context)return;section.append(canvas);
 const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const n=Math.hypot(...a)||1;return a.map(x=>x/n);};
 const target=scene.camera.target,offset=sub(scene.camera.position,target);let radius=Math.hypot(...offset),yaw=Math.atan2(offset[0],offset[2]),pitch=Math.asin(offset[1]/radius),drag=null;
 function draw(){
  const camera=[target[0]+radius*Math.cos(pitch)*Math.sin(yaw),target[1]+radius*Math.sin(pitch),target[2]+radius*Math.cos(pitch)*Math.cos(yaw)],forward=unit(sub(target,camera)),right=unit(cross(forward,Math.abs(forward[1])>.99?[0,0,1]:[0,1,0])),up=unit(cross(right,forward)),focus=canvas.height/2/Math.tan(scene.camera.fov*Math.PI/360),faces=[];
  const light=unit(scene.light?.direction||[.3,1,.5]),ambient=scene.light?.ambient??.3;
  const project=v=>{const d=sub(v,camera),z=dot(d,forward);if(z<.1)return null;return [canvas.width/2+dot(d,right)*focus/z,canvas.height/2-dot(d,up)*focus/z,z];};
  for(const object of scene.objects){const [sx,sy,sz]=object.size.map(x=>x/2),angle=(object.rotation||0)*Math.PI/180;const corners=[[-sx,-sy,-sz],[sx,-sy,-sz],[sx,sy,-sz],[-sx,sy,-sz],[-sx,-sy,sz],[sx,-sy,sz],[sx,sy,sz],[-sx,sy,sz]];const vertices=corners.map(([x,y,z])=>[object.position[0]+x*Math.cos(angle)+z*Math.sin(angle),object.position[1]+y,object.position[2]-x*Math.sin(angle)+z*Math.cos(angle)]);
   const indices=object.shape==='plane'?[[3,2,6,7]]:[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]];
   for(const ids of indices){const points=ids.map(i=>project(vertices[i]));if(points.some(p=>!p))continue;const normal=unit(cross(sub(vertices[ids[1]],vertices[ids[0]]),sub(vertices[ids[2]],vertices[ids[0]]))),brightness=ambient+(1-ambient)*Math.max(0,dot(normal,light)),rgb=[1,3,5].map(i=>Math.round(parseInt(object.color.slice(i,i+2),16)*brightness));faces.push({points,depth:points.reduce((s,p)=>s+p[2],0)/4,color:'rgb('+rgb.join(',')+')'});}
  }
  context.fillStyle=scene.background;context.fillRect(0,0,canvas.width,canvas.height);faces.sort((a,b)=>b.depth-a.depth);for(const face of faces){context.beginPath();face.points.forEach((p,i)=>i?context.lineTo(p[0],p[1]):context.moveTo(p[0],p[1]));context.closePath();context.fillStyle=face.color;context.fill();context.strokeStyle='#ffffff18';context.stroke();}
 }
 canvas.onpointerdown=e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.008;pitch=Math.max(-1.4,Math.min(1.4,pitch+(e.clientY-drag[1])*.008));drag=[e.clientX,e.clientY];draw();};canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};canvas.onwheel=e=>{e.preventDefault();radius=Math.max(1,Math.min(100,radius*(e.deltaY>0?1.1:.9)));draw();};canvas.style.maxWidth='100%';canvas.style.height='auto';canvas.style.touchAction='none';draw();
}
`;
