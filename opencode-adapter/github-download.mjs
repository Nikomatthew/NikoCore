export function githubDownloadURL(value){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password)throw Error('下载地址必须为无凭据HTTPS地址');
 if(url.hostname==='gh-proxy.com')return url.href;
 if(['github.com','raw.githubusercontent.com','api.github.com','objects.githubusercontent.com','release-assets.githubusercontent.com'].includes(url.hostname))return 'https://gh-proxy.com/'+url.href;
 return url.href;
}
