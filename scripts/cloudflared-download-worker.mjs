import {runCloudflaredDownload} from '../opencode-adapter/cloudflared-download-job.mjs';
const [home,root]=process.argv.slice(2);
try{await runCloudflaredDownload(home,root);}catch{process.exitCode=1;}
