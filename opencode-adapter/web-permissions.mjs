import { searchTerm } from './chat-search.mjs';

export const webPermissions = [{ action:'*',resource:'*',effect:'deny' },{ action:'websearch',resource:'*',effect:'ask' }];
export async function allowWebRequest(request) {
  if(!Array.isArray(request.resources)||request.resources.length<1||request.resources.length>3)return false;
  try{
    if(request.action==='websearch'){for(const value of request.resources){if(typeof value!=='string'||!value.trim()||Array.from(value).length>120||/https?:|\d{5,}|@|密码|密钥|token|cookie|authorization/i.test(value))return false;}return true;}
  }catch{return false;}return false;
}
