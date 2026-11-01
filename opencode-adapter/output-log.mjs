import { redactView, projectMessages } from './session-view.mjs';

export class OutputLog {
  constructor() { this.entries = []; this.serial = 0; this.signatures = new Map(); }
  add(level, scope, text, secrets = []) {
    const entry = { id: ++this.serial, at: Date.now(), level, scope: redactView(scope, secrets), text: redactView(text, secrets).slice(0, 12000) };
    this.entries.push(entry);
    if(this.sink){try{this.sink(entry);}catch{this.fileError='日志写入失败，请检查目录权限或磁盘空间';}}
    if (this.entries.length > 200) this.entries.shift();
    return entry;
  }
  messages(scope, messages, secrets = []) {
    for (const message of projectMessages(messages, secrets)) {
      for (const [index, part] of message.content.entries()) {
        if (!['text', 'reasoning'].includes(part.type) || !part.text) continue;
        const key = `${message.id}:${index}`;
        if (this.signatures.get(key) === part.text) continue;
        this.signatures.set(key, part.text);
        this.add(part.type === 'reasoning' ? 'reasoning' : 'reply', scope, part.text, secrets);
      }
      if (message.error) {
        const key = `${message.id}:error`;
        const text = `${message.error.type}：${message.error.message}`;
        if (this.signatures.get(key) !== text) { this.signatures.set(key, text); this.add('error', scope, text, secrets); }
      }
    }
    while (this.signatures.size > 1000) this.signatures.delete(this.signatures.keys().next().value);
  }
  read(after = 0) { return this.entries.filter(entry => entry.id > after); }
}
