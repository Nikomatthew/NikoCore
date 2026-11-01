import crypto from 'node:crypto';
export function allocateRoomNumber(rooms,randomInt=crypto.randomInt){for(let i=0;i<1000;i++){const id=String(randomInt(100000,1000000));if(!Object.hasOwn(rooms,id))return id;}throw Error('房间编号分配失败，请稍后重试');}
