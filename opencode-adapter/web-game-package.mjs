import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const webPackageManifest='game.web.json';
const safeFile=value=>typeof value==='string'&&value.length<=200&&/^[a-zA-Z0-9_-]+(?:[./-][a-zA-Z0-9_-]+)*$/.test(value)&&!value.split('/').some(part=>part==='.'||part==='..')&&!value.includes('\\');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const allowedExtensions=new Set(['.html','.css','.js','.mjs','.json','.png','.jpg','.jpeg','.webp','.gif','.ico','.glb','.gltf','.bin','.wasm','.ogg','.mp3','.wav','.woff','.woff2','.txt','.md']);
function readFile(root,name,maxBytes){
 if(!safeFile(name))throw Error('网页游戏包路径无效');
 let current=root;
 for(const part of name.split('/')){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())throw Error('网页游戏包禁止符号链接');}
 const stat=fs.lstatSync(current);
 if(!stat.isFile()||stat.nlink!==1||stat.size>maxBytes||fs.realpathSync(current)!==current)throw Error('网页游戏包文件无效或超出预算');
 const bytes=fs.readFileSync(current);if(bytes.length>maxBytes)throw Error('网页游戏包文件超出预算');return bytes;
}
export function inspectWebGamePackage(directory,{baseline,requirements={}}={}){
 const root=path.resolve(directory);if(fs.realpathSync(root)!==root)throw Error('网页游戏包目录无效');
 const manifestBytes=readFile(root,webPackageManifest,128000),manifest=JSON.parse(manifestBytes.toString('utf8'));
 if(!manifest||manifest.format!==1||manifest.type!=='web'||manifest.runtime!=='standalone'||typeof manifest.id!=='string'||!/^[-a-z0-9]{1,40}$/.test(manifest.id)||typeof manifest.name!=='string'||!manifest.name.trim()||manifest.name.length>40||!['2d','3d','mixed'].includes(manifest.dimension))throw Error('独立网页游戏包格式无效');
 if(baseline&&(manifest.id!==baseline.id||baseline.type!=='web'))throw Error('更改不能替换游戏身份或类型');
 if(!safeFile(manifest.entry)||!manifest.entry.endsWith('.html')||!Array.isArray(manifest.files)||!manifest.files.length||manifest.files.length>512)throw Error('网页游戏包入口或文件清单无效');
 if(!Array.isArray(manifest.inputs)||!manifest.inputs.length||manifest.inputs.length>32||manifest.inputs.some(input=>typeof input!=='string'||!input.trim()||input.length>100))throw Error('网页游戏包需声明实际输入方式');
  if(!Array.isArray(manifest.toolkit)||manifest.toolkit.length>32||manifest.toolkit.some(item=>typeof item!=='string'||!/^[-a-z0-9.]{1,64}$/.test(item)))throw Error('网页游戏包工具依赖无效');
   if(new Set(manifest.toolkit).size!==manifest.toolkit.length||manifest.toolkit.some(id=>!['identity','rooms','party','save','world','judge'].includes(id)))throw Error('网页游戏包引用了尚未接通的工具');
 if(!manifest.features||Array.isArray(manifest.features)||typeof manifest.features!=='object'||Object.keys(manifest.features).length>64||Object.entries(manifest.features).some(([key,value])=>!/^[-a-zA-Z0-9]{1,64}$/.test(key)||typeof value!=='boolean'))throw Error('网页游戏包功能声明无效');
 for(const [key,needed]of Object.entries(requirements))if(needed===true&&manifest.features[key]!==true)throw Error('网页游戏包未声明必需功能：'+key);
 if(!Array.isArray(manifest.assets)||manifest.assets.length>512)throw Error('网页游戏包资源清单无效');
 const names=new Set([webPackageManifest.toLowerCase()]),files=[{name:webPackageManifest,bytes:manifestBytes}],records=[];let total=manifestBytes.length;
 for(const name of manifest.files){
  if(!safeFile(name)||['niko-sdk.js','niko-kit.mjs'].includes(name)||names.has(name.toLowerCase())||!allowedExtensions.has(path.posix.extname(name).toLowerCase()))throw Error('网页游戏包文件重复或类型不允许');
  if(name.split('/').some(part=>/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part)))throw Error('网页游戏包包含保留路径');
  names.add(name.toLowerCase());const bytes=readFile(root,name,32*1024*1024);total+=bytes.length;if(total>128*1024*1024)throw Error('网页游戏包总大小超出预算');files.push({name,bytes});
 }
 if(!manifest.files.includes(manifest.entry))throw Error('网页游戏入口未列入文件清单');
  if(manifest.server!==undefined&&(!safeFile(manifest.server)||!manifest.files.includes(manifest.server)||! /\.(?:mjs|js)$/.test(manifest.server)))throw Error('网页游戏服务端入口无效');
  if(manifest.backend!==undefined&&(manifest.backend!=='quickjs-v1'||!manifest.server?.startsWith('server/')||manifest.entry.startsWith('server/')||!manifest.toolkit.includes('world')))throw Error('受限后端需quickjs-v1、server目录入口及world工具');
  if(manifest.backend==='quickjs-v1'&&files.find(file=>file.name===manifest.server).bytes.length>128000)throw Error('游戏后端源码超过128KiB预算');
 for(const asset of manifest.assets)if(!asset||!manifest.files.includes(asset.file)||typeof asset.source!=='string'||!asset.source.trim()||asset.source.length>1000||typeof asset.license!=='string'||!asset.license.trim()||asset.license.length>500||typeof asset.placeholder!=='boolean')throw Error('美术资源需声明文件、来源、许可和占位状态');
 for(const name of manifest.files)if(/\.(?:png|jpe?g|webp|gif|ico|glb|gltf|ogg|mp3|wav|woff2?)$/i.test(name)&&!manifest.assets.some(asset=>asset.file===name))throw Error('美术资源未列入来源清单：'+name);
 for(const file of files)records.push({name:file.name,size:file.bytes.length,sha256:digest(file.bytes)});
 records.sort((a,b)=>a.name.localeCompare(b.name,'en'));
 return {manifest,files,records,hash:digest(JSON.stringify(records)),totalBytes:total};
}
export function archiveWebGamePackage(directory,archiveRoot,options){
 const inspected=inspectWebGamePackage(directory,options);fs.mkdirSync(archiveRoot,{recursive:true});
 const destination=path.join(archiveRoot,inspected.hash);
 if(!fs.existsSync(destination)){
  const staging=path.join(archiveRoot,'.staging-'+crypto.randomUUID());fs.mkdirSync(staging);
  try{for(const file of inspected.files){const target=path.join(staging,file.name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.bytes,{flag:'wx',mode:0o600});}fs.renameSync(staging,destination);}catch(error){fs.rmSync(staging,{recursive:true,force:true});throw error;}
 }
 const archived=inspectWebGamePackage(destination,options);if(archived.hash!==inspected.hash)throw Error('网页游戏包归档摘要不一致');
 return {manifest:inspected.manifest,hash:inspected.hash,records:inspected.records,totalBytes:inspected.totalBytes,directory:destination};
}
export function standaloneGameRecord(archive){
 const m=archive.manifest;
  return {format:1,id:m.id,name:m.name,type:'web',kind:'standalone',initialCoins:0,commands:[],webPackage:{hash:archive.hash,dimension:m.dimension,entry:m.entry,inputs:m.inputs,toolkit:m.toolkit,features:m.features,...(m.backend?{backend:m.backend}: {})},multiplayer:{enabled:true,maxPlayers:10,party:{enabled:m.toolkit.includes('party'),maxMembers:4}},enabled:false,players:[]};
}
export function independentWebAuthoringInstruction(){return `制作独立完整网页游戏，不是QQ指令规则包。可根据需求自行搭建2D、3D或混合游戏，自行选择HTML/Canvas/WebGL和合适的本地依赖。不要强制使用commands、kind、flow或宿主按钮面板，不因出现3D就改成FPS。点击、文字、赛车、射击、RPG、社交、FPS、TPS等按用户需求设计实际玩法，不保证现有工具已经实现所有类型。工具包是可选辅助：账号、房间、多人组队、存档、排行等按需组合，不限制玩法、镜头或界面；未接入的接口不能伪造成功。
在任务目录生成game.web.json和清单中的实际文件。协议示例：{"format":1,"id":"my-game","name":"游戏名","type":"web","runtime":"standalone","dimension":"2d","entry":"client/index.html","files":["client/index.html","client/game.js","client/style.css"],"inputs":["WASD移动","E互动","鼠标左键攻击","1/2/3技能"],"toolkit":[],"features":{"multiplayer":false,"leaderboard":false,"presence":false},"assets":[]}。dimension为2d/3d/mixed；inputs必须对应实际实现而非照抄示例；工具依赖为可选ID数组；features只声明真实功能；可选server字段指向包内服务端源码，当前仅归档审核、不自动执行。已有游戏修改保留内部id、类型和存档兼容性，不直接改宿主原游戏或数据。不要自定六位公开编号。
files列出所有运行文件与资源，使用相对路径；入口必须HTML。禁止符号链接、可执行文件、秘密和依赖node_modules，单文件32MiB、总128MiB、512文件；模型glb/gltf/bin、贴图png/jpg/webp、音频ogg/mp3/wav与字体可本地打包，外部依赖需取得后本地打包并记录许可。assets每项包含file/source/license/placeholder，使用自制或取得合法许可的素材；统一风格、比例、配色、动画和反馈，占位资源要明确，不能把几何原型称成完成美术。
先写公开design.json，记录目标、核心循环、输入映射、镜头、实际决策、数值来源消耗、胜负重试、资源风格及工具依赖。实现真正运行的游戏循环、所需运动/碰撞/互动/战斗或叙事逻辑，HUD只做反馈与适合的菜单；不要把要求的移动、瞄准、驾驶替换成按钮。键鼠游戏处理失焦清除输入、右键菜单、退出指针锁定和资源释放。按需支持触摸，不强制所有游戏同一种输入。
独立客户端现在通过无同源权限的sandbox iframe运行，可自行使用Canvas/WebGL制作2D/3D，不能跳转顶层/弹窗/访问Cookie/连接外网。宿主自动注入window.NikoGame：identity()返回真实登录身份；rooms.list/create/join/read/leave提供房间；party.create(room,version)/join(room,party,version)/leave(room,version)提供真实队伍；save.read()/write(data,version)提供4KiB版本校验个人存档，客户端存档不可信，不能当作权威金币/排行榜/奖励。toolkit按需声明identity/rooms/party/save；SDK请求需await并处理error；room响应为{room}，list为{rooms}，存档为{data,version,authority}。多人房间需至少每3秒rooms.read心跳，超过5秒需要重新加入，不能假称已实现实时共享战斗或同步世界。
可选客户端辅助库：以new URL('niko-kit.mjs',document.querySelector('script[src$="niko-sdk.js"]').src).href作为动态import地址。导出createInput/createLoop/normalize2/overlaps2/overlaps3/moveBody2/createCooldowns/createEvents/createStateMachine/interactionTarget/clamp/lerp。输入用event.code（KeyW/KeyA/KeyS/KeyD/KeyE/Digit1/Mouse0/Mouse2），axis、down、pressed、released、pointer，endFrame清边沿，dispose释放。createLoop固定步进update(dt)与render(alpha,dt)，stop释放。辅助库可选，不约束自制逻辑，不是完整三维物理引擎。Three.js等库可本地打包到files；不加载远程CDN。
受限服务端可选backend="quickjs-v1"、server="server/main.js"，将源码列入files并声明world工具。纯JS定义function update(state,input,dt)，返回{state:{...}}；无Node/require/process/fetch，不能用import、文件、网络或系统API。NikoGame.world.action(room,action)在当前房间受限后端执行，input={player:真实身份,action:客户端动作}，客户端动作不可信，必须校验参数/冷却/权限，禁止直接接受任意伤害或金币。状态按房间共享，仅内存保留，后台重启不恢复。单次输入输出64KiB、脚本128KiB、受限堆8MiB/执行预算25ms；不是操作系统沙箱或任意Node后端，不声明绝对安全。server目录不会作为客户端资源发送。此接口只接共享自定义state，尚不能通过返回值调用持久奖励/背包或生成内建敌人。
world.read(room)/input(room,{sequence,x,z,attack})可读写可信宿主固定步进世界，sequence递增、x/z介于-1与1；只提交意图，不提交伤害、坐标或奖励。响应含world/coins/inventory/authority。当前HTTP请求预算每分钟120次，不当作高频实时WebSocket，客户端需插值并控制请求率。内建战斗仍为平面坐标/距离攻击基础，无任意3D技能/地图碰撞；缺口不能假称已实现。可选niko-3d.mjs与niko-sdk.js同目录，导出THREE/RAPIER/createPhysics/createAnimations/followCamera，提供本地3D刚体/胶囊角色和动画辅助，自制/复用可混合。不提供现成高质量素材库。不能宣称已开服或已通过多人/视觉体验验证。不启动自制Node后台，不读取NikoLink凭据，不绕过隔离。工具调用仍遵守现有任务审批与授权。`;}
