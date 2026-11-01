import fs from 'node:fs/promises';
import path from 'node:path';
import { mediaProcess } from './media-process.mjs';
import {mediaSettings,mediaCoverage} from './media-settings.mjs';

export function pickFrameTimes(duration, changes = [], count = 9, maxSeconds = 300) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('视频时长无效');
  const end = Math.min(duration, maxSeconds);
  return Array.from({ length: count }, (_, index) => {
    const start = end * index / count, stop = end * (index + 1) / count;
    const middle = (start + stop) / 2;
    const candidates = changes.filter(t => Number.isFinite(t) && t >= start && t < stop);
    const cut = candidates.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle))[0];
    return Math.max(start, Math.min(end - Math.min(0.02, end / 10), cut === undefined ? middle : Math.min(cut + 0.2, stop - Math.min(0.02, (stop - start) / 10))));
  });
}

export async function probeMedia(project, input, signal) {
  const value = await mediaProcess(path.join(project, 'tools', 'ffprobe.exe'), ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', input], { signal });
  const info = JSON.parse(value);
  const duration = Number(info.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('媒体时长无效');
  return { duration, video: info.streams?.some(s => s.codec_type === 'video'), audio: info.streams?.some(s => s.codec_type === 'audio') };
}

export async function buildStoryboard(project, input, directory, info, signal, settings={}) {
  const c=mediaSettings(settings);
  const ffmpeg = path.join(project, 'tools', 'ffmpeg.exe');
  const duration = mediaCoverage(info,'video',c);
  const metadata = path.join(directory, 'scenes.txt');
  await mediaProcess(ffmpeg, ['-nostdin', '-v', 'error', '-protocol_whitelist', 'file,pipe', '-i', input, '-t', String(duration), '-an', '-vf', "fps=2,scale=96:54,select='gt(scene,0.22)',metadata=print:file=scenes.txt", '-f', 'null', '-'], { signal, cwd: directory });
  const scan = await fs.readFile(metadata, 'utf8').catch(() => '');
  const changes = [...scan.matchAll(/pts_time:([\d.]+)/g)].map(m => Number(m[1]));
  const count=c.videoFrameStrategy==='interval'?Math.min(c.videoFrameCount,Math.max(1,Math.ceil(duration/c.videoIntervalSeconds))):c.videoFrameCount;
  const times = c.videoFrameStrategy==='interval'?Array.from({length:count},(_,i)=>Math.min(duration-0.02,(i+0.5)*c.videoIntervalSeconds)):pickFrameTimes(duration,c.videoFrameStrategy==='scene'?changes:[],count,duration);
  const columns=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/columns),width=Math.floor(c.videoSheetWidth/columns/2)*2,height=Math.floor(width*9/16/2)*2;
  for (const [index, time] of times.entries()) {
    await mediaProcess(ffmpeg, ['-nostdin', '-v', 'error', '-protocol_whitelist', 'file,pipe', '-ss', String(time), '-i', input, '-frames:v', '1', '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`, '-threads', '2', path.join(directory, `frame-${index + 1}.png`)], { signal });
  }
  const output = path.join(directory, 'storyboard.png');
  await mediaProcess(ffmpeg, ['-nostdin', '-v', 'error', '-framerate', '1', '-start_number', '1', '-i', path.join(directory, 'frame-%d.png'), '-vf', `tile=${columns}x${rows}:nb_frames=${count}:padding=4:margin=4:color=black`, '-frames:v', '1', '-threads', '2', output], { signal });
  const evidence = { duration: info.duration, covered: [0, duration], sampled: true, grid: `${columns}x${rows}，从左到右、从上到下`, cells: times.map((at, index) => ({ cell: index + 1, row: Math.floor(index / columns) + 1, column: index % columns + 1, seconds: Math.round(at * 100) / 100 })) };
  await fs.writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2));
  return { image: await fs.readFile(output), evidence };
}
