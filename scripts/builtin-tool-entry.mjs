import { runBuiltinTool } from '../opencode-adapter/builtin-tool.mjs';
let raw='';for await(const chunk of process.stdin){raw+=chunk;if(Buffer.byteLength(raw)>256000)throw Error('输入过大');}
const request=JSON.parse(raw);try{process.stdout.write(JSON.stringify(await runBuiltinTool(request.name,request.args,request.context)));}catch{console.error('内置工具执行失败，请检查参数、文件与依赖');process.exitCode=1;}
