import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import WebSocket from 'ws';
import {attachWorldTransport} from './world-transport.mjs';
test('世界WebSocket验证登录/CSRF和成员后传递输入，非法输入断开',async()=>{
 const server=http.createServer(),game={id:'demo',kind:'standalone',enabled:true};let touches=0;
 const service={session:token=>token==='valid'?{id:'a',csrf:'csrf',games:['demo']}:null,config:()=>({gamesEnabled:true}),engine:{find:()=>game},sessionMemberAllowed:()=>true,worlds:{request(g,u,input){assert.equal(u,'a');return {world:{tick:1},received:input.input};}},presenceState:()=>({sweep(){},touch(){touches++;}})};
 service.presence=service.presenceState();const close=attachWorldTransport(server,service);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const socket=new WebSocket(origin.replace('http:','ws:')+'/world-socket',{origin,headers:{Cookie:'niko_game=valid'}});
 try{await once(socket,'open');const response=once(socket,'message');socket.send(JSON.stringify({id:'1',csrf:'csrf',game:'demo',room:'123456',operation:'input',input:{sequence:1,x:1,z:0,attack:false}}));assert.equal(JSON.parse((await response)[0]).result.world.tick,1);assert.equal(touches,1);const ended=once(socket,'close');socket.send(JSON.stringify({id:'2',csrf:'wrong',game:'demo',room:'123456',operation:'read'}));await ended;}finally{socket.terminate();close();await new Promise(resolve=>server.close(resolve));}
});
