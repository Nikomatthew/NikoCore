import fs from 'node:fs';
export function windowsSubsystem(file,value){
 const bytes=fs.readFileSync(file);
 if(bytes.toString('ascii',0,2)!=='MZ')throw Error('不是Windows可执行文件');
 const pe=bytes.readUInt32LE(0x3c);if(bytes.toString('ascii',pe,pe+4)!=='PE\0\0')throw Error('PE头无效');
 const optional=pe+24,magic=bytes.readUInt16LE(optional);if(![0x10b,0x20b].includes(magic))throw Error('PE可选头无效');
 const offset=optional+68,previous=bytes.readUInt16LE(offset);
 if(value!==undefined){if(![2,3].includes(value))throw Error('仅允许GUI或Console子系统');bytes.writeUInt16LE(value,offset);fs.writeFileSync(file,bytes);}
 return previous;
}
