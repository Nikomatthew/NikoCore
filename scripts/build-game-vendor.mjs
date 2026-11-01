import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),destination=path.join(root,'runtime','game-vendor');fs.mkdirSync(destination,{recursive:true});
const entries=[['node_modules/three/build/three.module.js','three.module.js'],['node_modules/three/build/three.core.js','three.core.js'],['node_modules/@dimforge/rapier3d-compat/dist/rapier.mjs','rapier.mjs'],['node_modules/three/LICENSE','THREE-LICENSE.txt'],['node_modules/@dimforge/rapier3d-compat/LICENSE','RAPIER-LICENSE.txt']];
const records=[];
for(const [source,name]of entries){const bytes=fs.readFileSync(path.join(root,source));fs.writeFileSync(path.join(destination,name),bytes);records.push({name,size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
fs.writeFileSync(path.join(destination,'manifest.json'),JSON.stringify({three:'0.187.0',rapier:'0.21.0',files:records},null,2));console.log('Local 3D runtime built: '+destination);
