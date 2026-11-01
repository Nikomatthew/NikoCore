import path from 'node:path';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';
const home=process.argv[2];if(!home)throw Error('请指定干净发行目录');
const worker=new Worker(path.join(path.resolve(home),'runtime','game-worker','script-worker.cjs'),{workerData:{source:'function update(state,input,dt){return {state:{count:(state.count||0)+1},node:typeof process};}'}});
const timer=setTimeout(()=>{void worker.terminate();},10000);
try{const [ready]=await once(worker,'message');assert.equal(ready.ready,true,JSON.stringify(ready));const result=once(worker,'message');worker.postMessage({id:1,state:{count:4},input:{},dt:.05});const [value]=await result;assert.equal(value.result.state.count,5);assert.equal(value.result.node,'undefined');console.log('发行版QuickJS辅助入口/WASM及隔离脚本检查通过。');}finally{clearTimeout(timer);await worker.terminate();}
