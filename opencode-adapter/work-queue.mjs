import crypto from 'node:crypto';

export class WorkQueue {
  constructor({now=Date.now,onChange=()=>{},onExpire=()=>{}}={}){this.now=now;this.onChange=onChange;this.onExpire=onExpire;this.jobs=new Map();this.history=[];}
  begin(type,scope='',timeout=240000){const id=crypto.randomUUID(),job={id,type,scope,startedAt:this.now(),stage:'等待',timeout};this.jobs.set(id,job);this.onChange();let done=false;return {id,stage:value=>{if(!done&&this.jobs.has(id)){job.stage=value;this.onChange();}},end:()=>{if(done)return;done=true;if(this.jobs.delete(id)){this.history.push({...job,endedAt:this.now()});this.history=this.history.slice(-10);this.onChange();}}};}
  get size(){return this.jobs.size;}
  inspect(){return {active:[...this.jobs.values()].map(j=>({...j,elapsedMs:this.now()-j.startedAt})),recent:this.history};}
  sweep(){if([...this.jobs.values()].some(j=>this.now()-j.startedAt>j.timeout))this.onExpire();}
  clear(){this.jobs.clear();this.onChange();}
}
