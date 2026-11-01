export function playerMayJoin(game,player){return game.enabled===true&&!(game.blockedPlayers||[]).includes(player)&&(!(game.players||[]).length||game.players.includes(player));}
export function mayCreateGame(config,user){return user===config.ownerQQ||!(config.gameCreators||[]).length||config.gameCreators.includes(user);}
export function gameLifecycleSettings(input={},old={}){
 const out={};for(const [key,max]of [['gameMaxRooms',32],['gameMaxRunning',16],['gameMaxPlayers',100]]){const value=Number(input[key]??old[key]??(key==='gameMaxPlayers'?10:1));if(!Number.isInteger(value)||value<1||value>max)throw Error(`${key}超出范围`);out[key]=value;}
 const creators=input.gameCreators??old.gameCreators??[];if(!Array.isArray(creators)||creators.length>1000||creators.some(id=>typeof id!=='string'||!/^\d{5,15}$/.test(id)))throw Error('房间创建白名单无效');out.gameCreators=[...new Set(creators)];return out;
}
