import path from 'node:path';
import { fileURLToPath } from 'node:url';
export function applicationPaths(moduleURL,env=process.env){
 const source=env.NIKOLINK_HOME?path.join(env.NIKOLINK_HOME,'opencode-adapter'):path.dirname(fileURLToPath(moduleURL));
 const home=env.NIKOLINK_HOME||path.dirname(source);
 const root=env.NIKOLINK_APP_ROOT||path.join(home,'data','opencode-adapter');
 return {home,root,publicDirectory:path.join(home,'public')};
}
