import test from 'node:test';
import assert from 'node:assert/strict';
import {gameRequirements,unmetGameRequirements} from './game-requirements.mjs';
test('明确多人需求不能以单人flow交付，声明具备完整能力才通过',()=>{
 const required=gameRequirements('多人一起玩，在线人数和排行榜');assert.deepEqual(unmetGameRequirements({kind:'flow'},required),['多人房间','排行榜','在线人数']);
 assert.deepEqual(unmetGameRequirements({kind:'flow',multiplayer:{enabled:true,leaderboardField:'v_score'}},required),[]);
});
