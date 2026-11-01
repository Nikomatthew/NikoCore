import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Element {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.value='';this.open=false;this.scrollTop=0;}
  append(...items){for(const item of items)this.insertBefore(item,null);}
  insertBefore(item,before){item.remove();const i=before?this.children.indexOf(before):-1;if(i<0)this.children.push(item);else this.children.splice(i,0,item);item.parent=this;}
  remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}}
  replaceChildren(...items){for(const child of [...this.children])child.remove();this.append(...items);}
  setAttribute(){}
  get firstChild(){return this.children[0]||null;}
  get nextSibling(){return this.parent?.children[this.parent.children.indexOf(this)+1]||null;}
}
test('任务轮询保留details与指导输入节点、草稿及焦点，不重建未变化输出',async()=>{
  const els=Object.fromEntries(['tasks','error','refresh','idmSubmit'].map(id=>[id,new Element('div')]));
  let data={tasks:[{id:'a',status:'running',text:'任务',output:[{content:[{type:'text',text:'第一步'}]}]}],activeID:'a',permissions:[]};
  const document={querySelector:s=>els[s.slice(1)],createElement:t=>new Element(t)};
  const context=vm.createContext({document,history:{replaceState(){}},location:{pathname:'/tasks'},sessionStorage:{removeItem(){}},fetch:async()=>({ok:true,json:async()=>data}),AbortSignal,confirm:()=>true,setInterval(){}});
  vm.runInContext(fs.readFileSync(new URL('../public/task-console.js',import.meta.url),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  const card=els.tasks.firstChild,details=card.children.at(-1),input=card.children.at(-2).children[0],output=details.children[1],paragraph=output.firstChild;
  details.open=true;input.value='不要重新下载';input.selectionStart=2;document.activeElement=input;output.scrollTop=37;
  await vm.runInContext('refresh()',context);
  assert.equal(els.tasks.firstChild,card);assert.equal(details.open,true);assert.equal(input.value,'不要重新下载');assert.equal(document.activeElement,input);assert.equal(input.selectionStart,2);assert.equal(output.firstChild,paragraph);
  data={...data,tasks:[{...data.tasks[0],output:[{content:[{type:'text',text:'第二步'}]}]}]};
  await vm.runInContext('refresh()',context);
  assert.equal(details.open,true);assert.equal(input.value,'不要重新下载');assert.equal(output.scrollTop,37);assert.equal(output.firstChild.textContent,'第二步');
});
