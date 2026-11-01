import {WebGameManager as RealManager} from './web-game-manager.mjs';
export class WebGameManager extends RealManager{
 constructor(options){super({...options,tunnelFactory:()=>({child:null,url:null,start(){this.child={};this.url=options.store.value.gamePublicURL||'https://fixture.trycloudflare.com';},stop(){this.child=null;},view(){return {running:Boolean(this.child),url:this.url};}})});}
}
