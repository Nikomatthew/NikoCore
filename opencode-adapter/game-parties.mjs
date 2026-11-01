export function validatePartySettings(game){
 const value=game.multiplayer?.party;if(value===undefined)return;
 if(value.enabled===false&&game.kind==='standalone')return;
 if(!['flow','standalone'].includes(game.kind)||game.type!=='web'||game.multiplayer.enabled!==true||value.enabled!==true||!Number.isInteger(value.maxMembers)||value.maxMembers<2||value.maxMembers>game.multiplayer.maxPlayers)throw Error('队伍能力配置无效');
}
export function partyFor(room,user){return Object.values(room.parties||{}).find(p=>p.members.includes(user))||null;}
export function publicParties(room){return Object.values(room.parties||{}).map(p=>({id:p.id,leader:p.leader,members:[...p.members]}));}
export function changeParty(room,game,user,operation,target){
 validatePartySettings(game);if(!game.multiplayer?.party?.enabled)throw Error('本游戏未声明真实队伍能力');
 if(!room.players.includes(user))throw Error('不是当前房间玩家');room.parties??={};const own=partyFor(room,user);
 if(operation==='party-create'){
  if(own)throw Error('请先退出当前队伍');const id=String(room.nextParty||1);room.nextParty=Number(id)+1;room.parties[id]={id,leader:user,members:[user]};
 }else if(operation==='party-join'){
  if(own)throw Error('请先退出当前队伍');const party=room.parties[String(target)];if(!party)throw Error('队伍不存在');if(party.members.length>=game.multiplayer.party.maxMembers)throw Error('队伍已满');party.members.push(user);
 }else if(operation==='party-leave'){
  if(!own)throw Error('当前没有加入队伍');removePartyMember(room,user);
 }else throw Error('队伍操作无效');
}
export function removePartyMember(room,user){const party=partyFor(room,user);if(!party)return;party.members=party.members.filter(p=>p!==user);if(!party.members.length)delete room.parties[party.id];else if(party.leader===user)party.leader=party.members[0];}
export function partyAuthoringInstruction(){return ' 网页flow现在可声明multiplayer.party={"enabled":true,"maxMembers":4}使用真实队伍。建队、加入、退出及成员列表由宿主队伍接口处理，数据按房间共享；不要生成把v_party置1或凭空增加v_team的假组队。游戏内/组队指令可作为菜单，但不能声称该整数标记就是实际参战队友。共享敌人/多人战斗结算目前尚未提供，不能靠个人攻击加成伪称同步战斗。';}
