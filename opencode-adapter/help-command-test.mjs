import test from 'node:test';
import assert from 'node:assert/strict';
import {HelpCommand,HELP_MENU} from './help-command.mjs';
test('帮助仅由主人触发，群内需@，始终一条私聊并去重限频',async()=>{
 const value={ownerQQ:'123456',mode:'reply',groupEnabled:true,groups:['654321'],seen:[]};const sent=[];let now=20000;
 const handler=new HelpCommand({value,save(){}},async(...args)=>sent.push(args),()=>now);
 const event={post_type:'message',message_type:'group',user_id:123456,self_id:111111,group_id:654321,message_id:1,message:[{type:'text',data:{text:'/帮助'}}]};
 await handler.receive(event);assert.equal(sent.length,0);
 event.message.push({type:'at',data:{qq:'111111'}});await handler.receive({...event,user_id:222222});assert.equal(sent.length,0);
 await handler.receive(event);assert.deepEqual(sent,[[{group:false,target:'123456'},HELP_MENU,'text']]);
 await handler.receive(event);await handler.receive({...event,message_id:2});assert.equal(sent.length,1);
 now+=10001;await handler.receive({...event,message_id:3,message_type:'private',message:[event.message[0]]});assert.equal(sent.length,2);
 value.mode='paused';now+=10001;await handler.receive({...event,message_id:4});assert.equal(sent.length,2);
});
