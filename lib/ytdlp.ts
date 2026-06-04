import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface YtDlpResult {
  filePath: string;
}

/**
 * Downloads the audio track of a YouTube video using yt-dlp.
 *
 * Downloads the native audio stream without requiring ffmpeg for post-processing.
 * Prefers webm (opus) or m4a — both are accepted by the OpenAI Whisper API.
 *
 * @param url      Validated YouTube URL
 * @param jobId    Used to create a unique temp-file name
 * @returns        Absolute path to the downloaded audio file
 */
export async function downloadAudio(url: string, jobId: string): Promise<YtDlpResult> {
  const ytdlpBin = process.env.YTDLP_PATH ?? 'yt-dlp';
  // %(ext)s is replaced by yt-dlp with the actual container extension
  const outputTemplate = path.join(os.tmpdir(), `${jobId}.%(ext)s`);

  return new Promise((resolve, reject) => {
    // Use argument array — never interpolate into a shell string (prevents injection).
    // --print after_move:filepath writes the final file path to stdout so we don't
    // have to guess the extension ourselves.
    const args = [
      '--no-playlist',
      // Prefer webm/opus or m4a — no ffmpeg post-processing required
      '--format', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
      '--output', outputTemplate,
      '--print', 'after_move:filepath',
      '--', // end of options; treats next arg as a URL, not a flag
      url,
    ];

    const child = spawn(ytdlpBin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      // Ensure Homebrew binaries are on PATH for yt-dlp
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin${process.env.PATH ? `:${process.env.PATH}` : ''}`,
      },
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('yt-dlp timed out after 5 minutes'));
    }, DOWNLOAD_TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        const filePath = stdout.trim();
        if (!filePath) {
          reject(new Error('yt-dlp did not return an output file path'));
          return;
        }
        resolve({ filePath });
      } else {
        console.error(`[ytdlp] exited with code ${code}. stderr:\n${stderr}`);
        const message = parseYtDlpError(stderr);
        reject(new Error(message));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start yt-dlp: ${err.message}`));
    });
  });
}

function parseYtDlpError(stderr: string): string {
  if (stderr.includes('Private video')) return 'This video is private and cannot be downloaded.';
  if (stderr.includes('Video unavailable')) return 'This video is unavailable.';
  if (stderr.includes('This video is available to')) return 'This video requires a login or is age-restricted.';
  if (stderr.includes('not a valid URL')) return 'Invalid YouTube URL.';
  if (stderr.includes('ffprobe and ffmpeg not found') || stderr.includes('ffmpeg not found'))
    return 'Server configuration error: ffmpeg is not installed.';
  return 'Failed to download audio from YouTube. The video may be unavailable or restricted.';
}
