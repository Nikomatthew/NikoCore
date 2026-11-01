const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {launchSnowLuma}=require('./snowluma-launch.cjs');
test('SnowLuma 独立窗口启动，无config前置，无等待launcher退出',async()=>{
 let spec;
 const result=launchSnowLuma('D:\\fresh install',(command,args,options)=>{
   spec={command,args,options};const child=new EventEmitter();child.kill=()=>{};queueMicrotask(()=>child.emit('exit',0));return child;
 });
 assert.ok(result instanceof Promise);
 await result;
 const script=Buffer.from(spec.args.at(-1),'base64').toString('utf16le');
 assert.ok(script.includes('-WindowStyle Normal'));
 assert.ok(script.includes('Start-Process -FilePath $env:ComSpec'));
 assert.ok(!script.includes('-Wait'));assert.ok(!script.includes('config'));
 assert.equal(spec.options.env.NIKOLINK_SNOW_DIR,'D:\\fresh install');
});
