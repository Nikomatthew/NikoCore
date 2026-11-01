import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scanTaskTools } from './task-tool-registry.mjs';

export function authoringInstruction(prompt){return `创建一个可复用NikoLink任务工具，需求：${prompt}\n仅在本任务结果目录下新建tool-draft/<小写工具名>/tool.json、index.mjs及必要辅助文件。tool.json要求name与目录名一致、version、description、entry为index.mjs、inputSchema为object JSON Schema、permissions声明、timeoutSeconds为1到600秒。index.mjs导出async run(args,context)，context.workspace表示工作区，输出必须可JSON序列化。只生成代码，不运行生成代码、不安装依赖、不修改正在使用的task-tools、不读取密钥。文件只能相对任务工作区操作，不自动QQ投递，不虚构沙箱。将测试建议写入README.md。最终只回复“完成”，等待主人本机审核后安装并单独启用。`}
export function installToolDraft(task,home,owner,node=process.execPath){
 if(task.owner!==owner||task.taskType!=='tool-authoring'||task.status!=='succeeded'||!task.resultDir)throw Error('工具草稿任务未完成或身份不匹配');
 const folder=path.join(task.resultDir,'tool-draft');
 if(fs.lstatSync(folder).isSymbolicLink())throw Error('草稿目录不能是链接');
 const tools=scanTaskTools(folder);if(tools.length!==1||tools[0].error)throw Error('需要一个结构有效的工具草稿');
 const tool=tools[0];
 const result=spawnSync(node,['--check',tool.entry],{windowsHide:true,encoding:'utf8',timeout:10000});
 if(result.status!==0)throw Error('工具入口语法检查失败，未安装');
 const destination=path.join(home,'task-tools',tool.name);
 if(fs.existsSync(destination))throw Error('工具已存在，不覆盖；请使用不同名称');
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.cpSync(tool.folder,destination,{recursive:true,errorOnExist:true,force:false});
 return {name:tool.name,enabled:false};
}
