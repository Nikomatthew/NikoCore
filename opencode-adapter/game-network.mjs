import {parseGameRoutes} from './game-network-routes.mjs';
export function gameNetworkSettings(input={},old={}){
 const mode=input.gameNetworkMode??old.gameNetworkMode??'cloudflare';
  if(!['cloudflare','custom'].includes(mode))throw Error('游戏公网方式无效');
  if(mode==='cloudflare')return {gameNetworkMode:mode,gamePublicURL:'',webGamePort:0,gamePortMappings:old.gamePortMappings??''};
 const port=Number(input.webGamePort??old.webGamePort??0);if(!Number.isInteger(port)||port!==0&&(port<1024||port>65535))throw Error('网页游戏端口需为0或1024–65535');
 const routes=input.gamePortMappings??old.gamePortMappings??'';parseGameRoutes(routes);
  return {gameNetworkMode:mode,gamePublicURL:'',webGamePort:port,gamePortMappings:routes};
}
