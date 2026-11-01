import test from 'node:test';
import assert from 'node:assert/strict';
import {validateScene3D} from './scene3d.mjs';
import {validateGameDesign} from './game-design.mjs';
import {executeFlow} from './game-packages/flow.mjs';
import {scene3DClient} from './scene3d-client.mjs';
test('3D基础场景相机/几何/灯光与物体预算，不冒充物理模拟',()=>{
 const scene={version:1,background:'#101725',camera:{position:[8,6,8],target:[0,0,0],fov:60},objects:[{id:'box',shape:'box',position:[0,0,0],size:[1,1,1],color:'#ffffff'}]};assert.doesNotThrow(()=>validateScene3D(scene));assert.throws(()=>validateScene3D({...scene,physics:'dynamic'}));assert.throws(()=>validateScene3D({...scene,camera:{...scene.camera,position:[0,0,0]}}));assert.throws(()=>validateScene3D({...scene,objects:Array(65).fill(scene.objects[0])}));assert.doesNotThrow(()=>new Function(scene3DClient));
});
test('游戏数值表限制实际flow行动，越界失败不写入状态',()=>{
 const game={design:{version:1,goal:'完成探索',loop:['探索','恢复'],stats:[{field:'v_hp',label:'生命',min:0,max:100}]},flow:{version:1,initial:'start',states:['start'],values:{v_hp:100},actions:[{command:'/治疗',from:'start',to:'start',steps:[{op:'add',field:'v_hp',value:10}],reply:'生命{v_hp}'}]}};validateGameDesign(game);const state={};assert.throws(()=>executeFlow(game,state,'/治疗'),/生命/);assert.deepEqual(state,{});assert.throws(()=>validateGameDesign({...game,flow:{values:{v_hp:101}}}));
});
