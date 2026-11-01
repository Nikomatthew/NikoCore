export function judgeFailure(messages=[]){
 const errors=messages.map(m=>m.error).filter(Boolean),auth=errors.some(e=>e.type==='provider.auth'||e.status===401||e.statusCode===401),limited=errors.some(e=>e.status===429||e.statusCode===429);
 if(auth)return Object.assign(Error('游戏裁判渠道授权失败（401），请在共用OpenCode账号中检查所选渠道授权'),{judgeCode:'auth'});
 if(limited)return Object.assign(Error('游戏裁判请求受限（429），请稍后再试'),{judgeCode:'rate'});
 return null;
}
export function publicJudgeError(error,fallback){if(['auth','rate'].includes(error?.judgeCode))return error.message;if(error?.name==='TimeoutError'||error?.name==='AbortError')return '游戏裁判请求超时，未提交判定，请稍后再试';return fallback;}
