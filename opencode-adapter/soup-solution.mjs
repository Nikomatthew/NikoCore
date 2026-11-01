export function validateSolutionVerdict(value){
 if(!value||Object.keys(value).some(k=>!['solved','reason'].includes(k))||typeof value.solved!=='boolean'||typeof value.reason!=='string'||!value.reason.trim()||value.reason.length>800)throw Error('故事裁判返回格式无效');
 return {solved:value.solved,reason:value.solved?value.reason:'尚未还原关键因果，请继续提问或整理故事。'};
}
export async function submitSoupSolution({rooms,room,user,story,requestID,judge,authorized}){
 if(room.status!=='playing'||room.state?.kind!=='turtle-soup'||!room.members.includes(user)||typeof story!=='string'||!story.trim()||story.length>3000||typeof judge?.solve!=='function')throw Error('当前不能提交故事，故事需为1–3000字');
 if(room.requests.some(r=>r.user===user&&r.id===requestID))return rooms.get(room.id);
 const verdict=validateSolutionVerdict(await judge.solve(room,story));const latest=rooms.get(room.id);
 if(latest.version!==room.version||latest.status!=='playing'||!authorized())throw Error('判定期间房间状态或权限改变');
 return rooms.change(room.id,user,room.version,requestID,r=>{r.state.solutions??=[];r.state.solutions.push({user,story,solved:verdict.solved,reason:verdict.reason});r.state.solutions=r.state.solutions.slice(-30);if(verdict.solved){r.status='finished';r.result={winners:[user],reason:'story-solved',explanation:verdict.reason};}});
}
