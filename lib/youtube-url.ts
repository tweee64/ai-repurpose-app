/**
 * Validates whether a given string is a recognised YouTube URL.
 *
 * Accepted patterns:
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://www.youtube.com/shorts/VIDEO_ID
 */

const YOUTUBE_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=[\w-]+/,
  /^https?:\/\/youtu\.be\/[\w-]+/,
  /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
];

export function isValidYouTubeUrl(url: string): boolean {
  const trimmed = url.trim();
  return YOUTUBE_PATTERNS.some((pattern) => pattern.test(trimmed));
}
