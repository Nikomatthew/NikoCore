export function validateScene3D(scene){
 if(scene===undefined)return;
 const vector=(v,min,max)=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&n>=min&&n<=max);
 const color=v=>typeof v==='string'&&/^#[a-f0-9]{6}$/i.test(v);
 if(!scene||scene.version!==1||!color(scene.background)||!vector(scene.camera?.position,-100,100)||!vector(scene.camera?.target,-100,100)||!Number.isFinite(scene.camera?.fov)||scene.camera.fov<30||scene.camera.fov>90||!Array.isArray(scene.objects)||scene.objects.length>64)throw Error('3D场景格式或预算无效');
 if(Math.hypot(...scene.camera.position.map((n,i)=>n-scene.camera.target[i]))<.1)throw Error('3D相机位置不能与目标重合');
 const ids=new Set();for(const item of scene.objects){if(!item||typeof item.id!=='string'||!/^[-a-z0-9]{1,40}$/.test(item.id)||ids.has(item.id)||!['box','plane'].includes(item.shape)||!vector(item.position,-100,100)||!vector(item.size,.05,50)||!color(item.color)||item.rotation!==undefined&&(!Number.isFinite(item.rotation)||Math.abs(item.rotation)>360)||item.collidable!==undefined&&typeof item.collidable!=='boolean')throw Error('3D物体定义无效');ids.add(item.id);}
 if(scene.light!==undefined&&(!vector(scene.light.direction,-1,1)||Math.hypot(...scene.light.direction)<.01||!Number.isFinite(scene.light.ambient)||scene.light.ambient<0||scene.light.ambient>1))throw Error('3D灯光无效');
 if(scene.physics!==undefined&&scene.physics!=='none')throw Error('场景预览不提供物理模拟，不能声明未实现的physics');
}
export function scene3DInstruction(){return ' 3D制作基础：可在web游戏声明scene3d={"version":1,"background":"#101725","camera":{"position":[8,6,8],"target":[0,0,0],"fov":60},"light":{"direction":[0.3,1,0.5],"ambient":0.3},"physics":"none","objects":[{"id":"ground","shape":"plane","position":[0,0,0],"size":[12,0.1,12],"color":"#526b50"},{"id":"chest","shape":"box","position":[0,0.5,0],"size":[1,1,1],"rotation":0,"color":"#c99757"}]}。运行时支持基础三维顶点透视投影、面光照、相机鼠标拖动/缩放、box/plane及64物体预算，仅场景展示；collidable只是预留碰撞标记，不会自动生成物理或同步动作，不得宣称该标记已实现碰撞。所有资源本地声明，不加载任意脚本/远程模型。与flow状态按钮、design数值面板一起使用可制作3D场景配规则玩法；需要实时移动使用已安装fps包，但fps仍为固定高度射线2.5D，不能当自由三维模型/跳跃物理引擎。真正三维战斗/物理缺失时明确提出能力缺口，不能暗中降级。';}
