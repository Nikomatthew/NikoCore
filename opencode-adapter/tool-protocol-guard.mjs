export function containsToolProtocol(value){
 const text=String(value??'');
 return /<\s*\/?\s*(?:tool_call|tool_calls|function_call|function_calls|invoke|tool_result)\b/i.test(text)
  || /<\|(?:tool_call|tool_calls|tool_response|python_tag)[^>]*>/i.test(text)
  || /(?:^|\n)\s*(?:```(?:json)?\s*)?\{\s*"(?:name|tool|function)"\s*:\s*"[^"\r\n]+"\s*,\s*"(?:arguments|parameters|input)"\s*:/i.test(text);
}
export function assertPublicReply(value){if(containsToolProtocol(value))throw Error('模型返回了工具协议文本，已阻止发送；未将其当作搜索结果');}
