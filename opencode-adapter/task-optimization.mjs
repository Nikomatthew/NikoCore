export function optimizedTaskInstruction(config){
  return config.optimizedTasks===true?' 优化任务模式：先检查任务所需范围并复用已有工具与产物；用最少但完整的操作完成要求，不做无关探索、不增加未请求功能。可在本地计算与筛选后只返回必要结果，完整结果保留本地并提供明确位置；保留错误、未完成标记与验证证据，不以摘要代替用户要求的实际产物。不省略权限审批、输入校验及防数据丢失措施。':'';
}
