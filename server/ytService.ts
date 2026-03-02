import { execFile } from 'child_process';
import { promisify } from 'util';
import * as cache from './cache';

const execFileAsync = promisify(execFile);

const ENV_PATH = `${process.env.HOME}/.nix-profile/bin:/run/current-system/sw/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`;

async function runYtDlp(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('yt-dlp', args, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, PATH: ENV_PATH },
    });
    return stdout.trim();
  } catch (err: any) {
    throw new Error(`yt-dlp error: ${err.message || err.stderr || String(err)}`);
  }
}

export interface Track {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  durationStr: string;
  listId?: string;
}

function parseDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function bestThumbnail(thumbnails: any[], videoId: string): string {
  if (thumbnails && thumbnails.length > 0) {
    const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
    const url = sorted[0]?.url;
    if (url) return url;
  }
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function parseEntry(entry: any): Track | null {
  if (!entry?.id) return null;
  return {
    videoId: entry.id,
    title: entry.title || 'Unknown',
    artist: entry.uploader || entry.channel || entry.artist || 'Unknown Artist',
    thumbnail: bestThumbnail(entry.thumbnails || [], entry.id),
    duration: entry.duration || 0,
    durationStr: parseDuration(entry.duration || 0),
    listId: entry.playlist_id,
  };
}

function parseLines(output: string): Track[] {
  const tracks: Track[] = [];
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      const track = parseEntry(entry);
      if (track) tracks.push(track);
    } catch (_) {}
  }
  return tracks;
}

export async function searchTracks(query: string): Promise<Track[]> {
  const cacheKey = `search:${query}`;
  const cached = cache.get<Track[]>(cacheKey);
  if (cached) return cached;

  const output = await runYtDlp([
    `ytsearch10:${query}`,
    '--dump-json',
    '--flat-playlist',
    '--no-playlist',
    '--quiet',
    '--no-warnings',
  ]);

  const tracks = parseLines(output);
  cache.set(cacheKey, tracks);
  return tracks;
}

export async function getStreamUrl(videoId: string): Promise<string> {
  const cacheKey = `stream:${videoId}`;
  const cached = cache.get<string>(cacheKey);
  if (cached) return cached;

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  let streamUrl: string;
  try {
    streamUrl = await runYtDlp([
      '-f', 'bestaudio[ext=webm]/bestaudio/best',
      '-g',
      '--no-playlist',
      '--no-warnings',
      url,
    ]);
  } catch (err: any) {
    if (err.message?.includes('403')) {
      streamUrl = await runYtDlp([
        '-f', 'bestaudio',
        '-g',
        '--no-playlist',
        '--no-warnings',
        url,
      ]);
    } else {
      throw err;
    }
  }

  const finalUrl = streamUrl.split('\n')[0].trim();
  if (!finalUrl) throw new Error('Empty stream URL returned');
  cache.set(cacheKey, finalUrl, 240);
  return finalUrl;
}

export async function getRelatedTracks(videoId: string, title?: string, artist?: string): Promise<Track[]> {
  const cacheKey = `related:${videoId}`;
  const cached = cache.get<Track[]>(cacheKey);
  if (cached) return cached;

  const searchQuery = title && artist
    ? `${artist} ${title} music`
    : title
    ? `${title} music`
    : 'popular music 2024';

  const tracks = await searchTracks(searchQuery);
  cache.set(cacheKey, tracks);
  return tracks;
}

export async function getQueueFromPlaylist(videoId: string, listId: string): Promise<Track[]> {
  const cacheKey = `queue:${listId}`;
  const cached = cache.get<Track[]>(cacheKey);
  if (cached) return cached;

  const url = `https://www.youtube.com/playlist?list=${listId}`;

  let output: string;
  try {
    output = await runYtDlp([
      url,
      '--flat-playlist',
      '--dump-json',
      '--quiet',
      '--no-warnings',
      '--playlist-items', '1:50',
    ]);
  } catch {
    return await getRelatedTracks(videoId);
  }

  const tracks = parseLines(output);
  if (tracks.length === 0) return await getRelatedTracks(videoId);

  cache.set(cacheKey, tracks);
  return tracks;
}

export async function getRecommendations(videoId?: string, title?: string, artist?: string): Promise<Track[]> {
  const cacheKey = `recs:${videoId || 'default'}`;
  const cached = cache.get<Track[]>(cacheKey);
  if (cached) return cached;

  let tracks: Track[];
  if (videoId && title) {
    tracks = await getRelatedTracks(videoId, title, artist);
  } else {
    tracks = await searchTracks('top music hits 2024');
  }

  cache.set(cacheKey, tracks, 600);
  return tracks;
}
