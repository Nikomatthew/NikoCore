export function selectMemoryRecords(records,query,limit=12){
 const text=String(query||'').toLowerCase();
 const terms=[...new Set(text.match(/[a-z0-9_]{2,}|[\u4e00-\u9fff]{2}/g)||[])].slice(0,80);
 return records.map((record,index)=>{const body=`${record.title||''} ${record.text||''}`.toLowerCase();return {record,index,score:terms.reduce((n,t)=>n+(body.includes(t)?1:0),0)+(record.pinned?2:0)};})
 .filter(x=>x.record.clarity!=='forgotten'&&(x.score>0||!terms.length))
 .sort((a,b)=>b.score-a.score||b.index-a.index).slice(0,limit).sort((a,b)=>a.index-b.index).map(x=>x.record);
}
