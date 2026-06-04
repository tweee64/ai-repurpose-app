import OpenAI from 'openai';
import fs from 'fs';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }
    // Groq provides an OpenAI-compatible API — just swap the base URL
    client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return client;
}

/**
 * Transcribes an audio file using Groq's Whisper API (OpenAI-compatible).
 *
 * @param filePath  Absolute path to the audio file (webm / m4a / mp3, max 25 MB)
 * @returns         Transcript text
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  const groq = getClient();

  const fileStream = fs.createReadStream(filePath);

  const response = await groq.audio.transcriptions.create({
    model: 'whisper-large-v3',
    file: fileStream,
    response_format: 'text',
  });

  // When response_format is 'text', the response is a plain string
  return response as unknown as string;
}
