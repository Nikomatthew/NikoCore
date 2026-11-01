import {parseGameRoutes} from './game-network-routes.mjs';
export function selectGameRoute(config,claims){
 if(config.gameNetworkMode!=='custom')return null;
 const used=new Set(claims.values());
 return parseGameRoutes(config.gamePortMappings||'').find(route=>!used.has(route.port))||null;
}
