import { pathToFileURL } from 'node:url';
let raw='';
for await (const chunk of process.stdin) { raw+=chunk; if(Buffer.byteLength(raw)>256000)throw Error('工具输入过大'); }
const input=JSON.parse(raw);
const originalLog=console.log;
console.log=(...args)=>console.error(...args);
try {
  const module=await import(pathToFileURL(process.argv[2]).href);
  if(typeof module.run!=='function')throw Error('工具未导出run函数');
  const result=await module.run(input.arguments,{workspace:input.workspace,taskID:input.taskID});
  const serialized=JSON.stringify(result??null);
  if(Buffer.byteLength(serialized)>1000000)throw Error('结果超过1MB，请将大内容保存为文件');
  console.log=originalLog;
  process.stdout.write(serialized);
}catch(error){console.error(String(error.message));process.exitCode=1;}
