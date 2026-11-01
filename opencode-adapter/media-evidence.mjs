export function transcriptEvidence(transcript,{maxCharacters=24000,maxSegments=150}={}){
 const text=String(transcript.text||''),all=Array.isArray(transcript.segments)?transcript.segments:[];
 const choose=(items,count)=>items.length<=count?items:Array.from({length:count},(_,i)=>items[Math.round(i*(items.length-1)/(count-1))]);
 let excerpt=text,selection='complete';
 if(text.length>maxCharacters){
  selection='distributed-excerpts';const count=12,labelBudget=600,budget=Math.max(1,Math.floor((maxCharacters-labelBudget)/count)),width=text.length/count;
  excerpt=Array.from({length:count},(_,i)=>{const start=i===count-1?text.length-budget:Math.floor(i*width);return `[文字位置${start}/${text.length}] `+text.slice(start,start+budget);}).join('\n');
 }
 const segments=choose(all,maxSegments).map(s=>({start:s.start,end:s.end,text:String(s.text||'').slice(0,300)}));
 return {transcript:excerpt,transcriptTruncated:text.length>maxCharacters,transcriptSelection:selection,segments,segmentsOmitted:Math.max(0,all.length-segments.length),speechRange:all.length?[all[0].start,all.at(-1).end]:null,source:transcript.source||'local-asr',error:transcript.error||''};
}
