export const HELP_MENU = `NikoLink 指令菜单

任务
/任务 内容
/创建工具 需求
/进度 编号
/暂停 编号
/继续 编号
/指导 编号 补充内容
/打断 编号 新要求

主人私聊审批（不加斜线）
同意 编号 / 不同意 编号
发送文件 编号 / 不发送文件 编号
仅一个待批任务时可直接回复同意或不同意。

表情与消息
/存表情 名称（附单张图片或引用近期单图）
/发表情 名称
/撤回（引用机器人最近两分钟的消息）

/帮助：私信给主人本菜单。
游戏功能
/游戏列表：在当前会话列出游戏名和六位编号
/游戏生成 需求：主人创建待审批的游戏生成任务
/网页游戏生成 需求：主人创建待审批的网页游戏生成任务
/游戏更改 六位编号 修改要求
/网页游戏更改 六位编号 修改要求
/游戏创建 六位编号：创建Bot房间
/网页游戏创建 六位编号：启动网页游戏并发送链接
/游戏加入 六位编号 房间号
/游戏退出：退出本人当前房间；Bot房主退出结束该房间
/开始游戏：房主开始本人当前房间的游戏
/游戏停止 六位编号 [房间号]
/网页游戏停止 六位编号 [房间号]
普通房主仅能停止自己的房间；主人可停止全部。
/网页登录 验证码：仅私聊机器人，用于网页QQ身份验证；权限按网页登录设置检查。
/房间 房间编号；/准备 房间编号；/开始 房间编号
/结束回合 房间编号
谁是卧底：/确认身份 房间编号、/描述 房间编号 内容、/投票 房间编号 座位号。
海龟汤：本局玩家@机器人提问，或/提问 房间编号 问题；房主/揭晓 房间编号。
/提交故事 完整故事：在当前海龟汤房间申请还原判定，猜中后公布理由并记录胜场。
角色仅私发；投递失败不自动重发。
/战绩 游戏编号：读取本人参与、胜利和MVP次数。
/评分 房间编号：房主为已结束对局申请AI评分，需要配置游戏裁判模型。
编号可用唯一前缀，指导与打断必须先写编号。
任务管理仅限主人，回复模式下使用；群内需在白名单且@机器人。
继续适用于保留会话的已停止任务，不能重跑已完成任务。
表情按群/私聊分区保存；普通用户只能撤回机器人对自己的回复。
批准执行不代表批准全部工具或文件投递，仍按控制台授权执行。`;

export class HelpCommand {
  constructor(store,send,now=Date.now){this.store=store;this.send=send;this.now=now;this.last=new Map();}
  async receive(event){
    const parts=Array.isArray(event.message)?event.message:[];
    if(parts.filter(p=>p.type==='text').map(p=>p.data?.text||'').join('').trim()!=='/帮助')return false;
    const c=this.store.value,group=event.message_type==='group';
    if(event.post_type!=='message'||!['private','group'].includes(event.message_type)||String(event.user_id)!==c.ownerQQ||String(event.user_id)===String(event.self_id)||c.mode!=='reply'||parts.some(p=>!['text','at'].includes(p.type)))return true;
    if(group&&(!c.groupEnabled||!c.groups.includes(String(event.group_id))||!parts.some(p=>p.type==='at'&&String(p.data?.qq)===String(event.self_id))))return true;
    const key=`help:${event.self_id}:${event.message_id}`;
    if(event.message_id==null||c.seen.includes(key)||this.now()-(this.last.get(c.ownerQQ)??-Infinity)<10000)return true;
    this.last.set(c.ownerQQ,this.now());c.seen.push(key);c.seen=c.seen.slice(-5000);this.store.save();
    await this.send({group:false,target:c.ownerQQ},HELP_MENU,'text');return true;
  }
}
