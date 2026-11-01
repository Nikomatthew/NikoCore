import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'THIRD_PARTY_LICENSES.md');
const original=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
if(!original.includes('## 1. LICENSE'))throw Error('输入不是待整理的旧合并文档，未修改');
const sections=[...original.matchAll(/^## \d+\. (.+)\n/gm)];
const entries=[];
for(let i=0;i<sections.length;i++){
 const match=sections[i];let text=original.slice(match.index+match[0].length,sections[i+1]?.index??original.length).trim().replace(/\n---\s*$/,'').trim();
 const name=match[1];
 if(name==='THIRD_PARTY_NOTICES.md')continue;
 let title;
 if(name==='LICENSE'){title='上游代码（MIT）';const end=text.indexOf('\n---');if(end>=0)text=text.slice(0,end).trim();}
 else if(name==='NODE-LICENSE.txt')title='Node.js';
 else title=[...new Set(name.split(' / ').map(value=>value.replace(/^(?:opencode-adapter_)?node_modules_/,'').replace(/[-_](?:license)(?:\.(?:md|txt))?$/i,'').replace('@standard-schema_spec','@standard-schema/spec')))].join('、');
 entries.push({title,text});
}
const header='# NikoLink 第三方许可证\n\n本文件汇集上游代码及所附第三方组件的版权声明和许可证原文。各组件分别适用其对应条款，NikoLink 的修改不改变第三方权利人的版权归属。\n\n改版作者：[Niko_matthew](https://space.bilibili.com/253692742)。\n\n## 适用范围\n\n- 下列章节保留上游代码、内嵌 Node.js 运行时及所用组件的许可正文。相同许可文本按组件名称合并列示。\n- OpenCode、SnowLuma、Tabbit 等独立安装的软件不随此发布包分发，适用各自版本的许可及服务条款。\n- 安装器后续下载的 FFmpeg、yt-dlp、Python、语音识别组件和模型权重，适用对应下载版本的条款；本文件不替代这些组件附带的许可证。\n- 本文件中的适用范围说明不新增许可限制，也不替代各节许可证正文。\n\n## 目录\n\n'+entries.map(e=>'- '+e.title).join('\n')+'\n\n---\n\n';
const output=header+entries.map(e=>'## '+e.title+'\n\n'+e.text+'\n').join('\n---\n\n');
for(const entry of entries)assert.ok(output.includes(entry.text));
assert.equal(entries.length,25);
assert.ok(!output.includes('COMBINED-LICENSES.md'));
const backup=path.join(root,'backups','licenses-before-cleanup-'+Date.now());fs.mkdirSync(backup,{recursive:true});fs.copyFileSync(file,path.join(backup,'THIRD_PARTY_LICENSES.md'));
fs.writeFileSync(file,output);
console.log(`已整理 ${entries.length} 节，许可正文逐节完整性检查通过。备份：${backup}`);
