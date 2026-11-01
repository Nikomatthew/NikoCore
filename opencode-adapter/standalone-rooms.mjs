import {WebFlowRooms} from './web-flow-rooms.mjs';
export class StandaloneRooms extends WebFlowRooms{
 constructor(...args){super(...args);let changed=false;for(const room of Object.values(this.rooms))if(room.status==='playing'&&!room.players?.length){room.status='closed';room.version++;changed=true;}if(changed)this.save();}
 act(game,user,input){
  if(!['create','join','read','leave','party-create','party-join','party-leave'].includes(input.operation))throw Error('独立游戏房间操作无效');
  if(input.operation.startsWith('party-')&&!game.webPackage.toolkit.includes('party'))throw Error('游戏未声明队伍工具');
  const adapter={...game,kind:'flow',flow:{values:{}},multiplayer:{...game.multiplayer,party:game.multiplayer.party?.enabled?game.multiplayer.party:undefined}};
  return super.act(adapter,user,input);
 }
}
