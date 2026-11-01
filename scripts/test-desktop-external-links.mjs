import fs from 'node:fs';
import assert from 'node:assert/strict';
const panel=fs.readFileSync(new URL('../desktop/Panel.cs',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../public/console-opencode.html',import.meta.url),'utf8');
const launcher=fs.readFileSync(new URL('./test-desktop-source.mjs',import.meta.url),'utf8');
assert.match(panel,/NewWindowRequested\+=\(s,e\)=>\{e.Handled=true;if\(!e.IsUserInitiated\|\|closing\)return;OpenExternalLink\(e.Uri\);\}/);
assert.ok(panel.includes('value.Length>4096'));
assert.ok(panel.includes('!(uri.Scheme=="https"||uri.Scheme=="http")'));
assert.ok(panel.includes('!String.IsNullOrEmpty(uri.UserInfo)'));
assert.ok(panel.includes('new System.Diagnostics.ProcessStartInfo(uri.AbsoluteUri){UseShellExecute=true}'));
assert.match(panel,/NavigationStarting\+=[^\n]+e.Cancel=true/);
const links=[...html.matchAll(/<section data-page="about">([\s\S]*?)<\/section>/g)].flatMap(section=>[...section[1].matchAll(/<a\b[^>]*>/g)].map(match=>match[0]));
assert.ok(links.length>0);
for(const link of links){assert.match(link,/href="https?:\/\//);assert.match(link,/target="_blank"/);assert.match(link,/rel="noopener noreferrer"/);}
assert.ok(launcher.includes('v3-desktop-shell-external-links'));
console.log('外部链接静态回归检查通过：用户点击、HTTP/HTTPS、无凭据、系统浏览器及关于链接属性；未实际启动浏览器。');
