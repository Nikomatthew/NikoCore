export class ImageFollowup {
  constructor(now=Date.now){this.now=now;this.cache=new Map();this.revision=null;}
  apply(route,config){
    if(this.revision!==config.revision){this.cache.clear();this.revision=config.revision;}
    if(!config.visionEnabled||config.mode!=='reply')return route;
    const key=`${route.key}:${route.user}`;
    for(const [id,value]of this.cache)if(this.now()-value.at>120000)this.cache.delete(id);
    if(route.images?.length){this.cache.set(key,{images:[...route.images],messageID:route.messageID,at:this.now()});if(this.cache.size>100)this.cache.delete(this.cache.keys().next().value);return route;}
    if(route.addressedOther||route.replyToOther||!/这是谁|这个是谁|图里|图片|这张|刚才.{0,6}图|什么角色|哪个角色|什么作品/.test(route.text))return route;
    const recent=this.cache.get(key);
    if(!recent||route.replyID&&route.replyID!==recent.messageID)return route;
    return {...route,images:recent.images,text:route.text+'\n[本轮重新附上该用户在本会话两分钟内最近发送的图片，不代表已确认图片中的身份]'};
  }
}
