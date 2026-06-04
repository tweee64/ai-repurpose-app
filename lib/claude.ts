import OpenAI from 'openai';
import type { Tweet } from '@/types/repurpose';

const TWITTER_THREAD_SYSTEM_PROMPT = `You are an expert social media strategist specialising in Twitter/X threads.

Transform the provided transcript into a high-engagement Twitter thread.

Rules:
- Return ONLY a valid JSON object. Do not include any explanation, markdown, or prose outside the JSON.
- The JSON must have this exact shape: { "tweets": [ { "index": 1, "text": "..." }, ... ] }
- The thread must have between 5 and 15 tweets.
- Tweet 1 MUST be a compelling hook that makes the reader want to read the rest of the thread.
- Every tweet's "text" field must be 280 characters or fewer (including the "N/" prefix if you use one).
- Use line breaks within tweet text for readability.
- End the thread with a summary or call-to-action tweet.
- Focus on the most valuable, shareable insights from the transcript.
- Write in a conversational, first-person style.`;

const LINKEDIN_POST_SYSTEM_PROMPT = `You are an expert LinkedIn content strategist.

Transform the provided transcript into a single high-engagement LinkedIn post.

Rules:
- Return ONLY a valid JSON object. Do not include any explanation, markdown, or prose outside the JSON.
- The JSON must have this exact shape: { "post": "..." }
- The post must be between 900 and 1300 characters.
- Begin with a strong opening line (hook) that grabs attention in the LinkedIn feed.
- Follow with 3–5 key insights or takeaways from the transcript, written in narrative prose.
- End with a closing question or call-to-action that encourages comments or engagement.
- Write in a professional but conversational first-person tone appropriate for LinkedIn.
- Use line breaks between sections for readability.
- Do NOT use bullet points or numbered lists — write in flowing paragraphs.`;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }
    client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return client;
}

export async function generateTwitterThread(transcriptText: string): Promise<Tweet[]> {
  const groq = getClient();

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 2048,
    messages: [
      { role: 'system', content: TWITTER_THREAD_SYSTEM_PROMPT },
      { role: 'user', content: `Transform this transcript into a Twitter thread:\n\n${transcriptText}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '';

  // Strip markdown code fences that some models wrap around JSON
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed: { tweets: Tweet[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Failed to parse thread output');
  }

  if (!Array.isArray(parsed?.tweets)) {
    throw new Error('Failed to parse thread output');
  }

  return parsed.tweets;
}

export async function generateLinkedInPost(transcriptText: string): Promise<string> {
  const groq = getClient();

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: LINKEDIN_POST_SYSTEM_PROMPT },
      { role: 'user', content: `Transform this transcript into a LinkedIn post:\n\n${transcriptText}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '';

  // Strip markdown code fences that some models wrap around JSON
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed: { post: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Failed to parse post output');
  }

  if (typeof parsed?.post !== 'string' || !parsed.post) {
    throw new Error('Failed to parse post output');
  }

  return parsed.post;
}

const TWITTER_THREAD_STREAM_SYSTEM_PROMPT = `You are an expert social media strategist specialising in Twitter/X threads.

Transform the provided transcript into a high-engagement Twitter thread.

Rules:
- Output each tweet as plain text followed immediately by the delimiter ---TWEET--- on its own line.
- Do NOT output any JSON, markdown, or prose outside of the tweet texts and delimiters.
- The thread must have between 5 and 15 tweets.
- Tweet 1 MUST be a compelling hook that makes the reader want to read the rest of the thread.
- Every tweet must be 280 characters or fewer.
- Use line breaks within tweet text for readability.
- End the thread with a summary or call-to-action tweet.
- Focus on the most valuable, shareable insights from the transcript.
- Write in a conversational, first-person style.

Example output format:
This is tweet number one.
---TWEET---
This is tweet number two.
---TWEET---`;

const LINKEDIN_POST_STREAM_SYSTEM_PROMPT = `You are an expert LinkedIn content strategist.

Transform the provided transcript into a single high-engagement LinkedIn post.

Rules:
- Output ONLY the post text — no JSON, no markdown code fences, no labels.
- The post must be between 900 and 1300 characters.
- Begin with a strong opening line (hook) that grabs attention in the LinkedIn feed.
- Follow with 3–5 key insights or takeaways from the transcript, written in narrative prose.
- End with a closing question or call-to-action that encourages comments or engagement.
- Write in a professional but conversational first-person tone appropriate for LinkedIn.
- Use line breaks between sections for readability.
- Do NOT use bullet points or numbered lists — write in flowing paragraphs.`;

const TWEET_DELIMITER = '---TWEET---';

export async function streamTwitterThread(
  transcriptText: string,
  onTweet: (tweet: { index: number; text: string }) => void,
  signal?: AbortSignal,
): Promise<void> {
  const groq = getClient();

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 2048,
    stream: true,
    messages: [
      { role: 'system', content: TWITTER_THREAD_STREAM_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Transform this transcript into a Twitter thread:\n\n${transcriptText}`,
      },
    ],
  });

  let buffer = '';
  let tweetIndex = 1;

  for await (const chunk of stream) {
    if (signal?.aborted) break;
    const token = chunk.choices[0]?.delta?.content ?? '';
    buffer += token;

    let delimIdx: number;
    while ((delimIdx = buffer.indexOf(TWEET_DELIMITER)) !== -1) {
      const tweetText = buffer.slice(0, delimIdx).trim();
      buffer = buffer.slice(delimIdx + TWEET_DELIMITER.length).trimStart();
      if (tweetText) {
        onTweet({ index: tweetIndex++, text: tweetText });
      }
    }
  }

  // Flush any remaining text after the last delimiter (or if there was no delimiter at all)
  const remaining = buffer.trim();
  if (remaining) {
    onTweet({ index: tweetIndex, text: remaining });
  }
}

export async function streamLinkedInPost(
  transcriptText: string,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const groq = getClient();

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: 'system', content: LINKEDIN_POST_STREAM_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Transform this transcript into a LinkedIn post:\n\n${transcriptText}`,
      },
    ],
  });

  for await (const chunk of stream) {
    if (signal?.aborted) break;
    const token = chunk.choices[0]?.delta?.content ?? '';
    if (token) {
      onDelta(token);
    }
  }
}

const BLOG_POST_SYSTEM_PROMPT = `You are an expert blog writer and SEO strategist.

Transform the provided transcript into a long-form, SEO-ready blog post.

Rules:
- Return ONLY a valid JSON object with this exact shape: { "post": "..." } where the value is the full blog post in Markdown, including the # title and > meta description line.
- Do not include any explanation, markdown code fences, or prose outside the JSON.
- Begin with a single H1 heading (# Title) that is compelling and keyword-rich.
- On the very next line, output the meta description in this exact format:
  > Meta description: [one sentence, 150–160 characters, keyword-rich]
- Follow with an engaging introduction paragraph (2–3 sentences).
- Include 3–6 H2 sections (## Heading) with body paragraphs under each.
  - Use H3 (### Sub-heading) where sub-sections add clarity.
- End with a ## Conclusion section summarising key takeaways.
- Write in a natural, active, first-person voice based on the source content.
- Use short paragraphs (2–4 sentences each) for readability.
- Target 600–1200 words total.`;

const BLOG_POST_STREAM_SYSTEM_PROMPT = `You are an expert blog writer and SEO strategist.

Transform the provided transcript into a long-form, SEO-ready blog post.

Rules:
- Output ONLY the blog post content — no preamble, no code fences, no JSON.
- Begin with a single H1 heading (# Title) that is compelling and keyword-rich.
- On the very next line, output the meta description in this exact format:
  > Meta description: [one sentence, 150–160 characters, keyword-rich]
- Follow with an engaging introduction paragraph (2–3 sentences).
- Include 3–6 H2 sections (## Heading) with body paragraphs under each.
  - Use H3 (### Sub-heading) where sub-sections add clarity.
- End with a ## Conclusion section summarising key takeaways.
- Write in a natural, active, first-person voice based on the source content.
- Use short paragraphs (2–4 sentences each) for readability.
- Target 600–1200 words total.`;

export async function generateBlogPost(transcriptText: string): Promise<string> {
  const groq = getClient();

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: BLOG_POST_SYSTEM_PROMPT },
      { role: 'user', content: `Transform this transcript into a blog post:\n\n${transcriptText}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '';

  // Strip markdown code fences that some models wrap around JSON
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  let parsed: { post: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Failed to parse blog post output');
  }

  if (typeof parsed?.post !== 'string' || !parsed.post) {
    throw new Error('Failed to parse blog post output');
  }

  return parsed.post;
}

export async function streamBlogPost(
  transcriptText: string,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const groq = getClient();

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 4096,
    stream: true,
    messages: [
      { role: 'system', content: BLOG_POST_STREAM_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Transform this transcript into a blog post:\n\n${transcriptText}`,
      },
    ],
  });

  for await (const chunk of stream) {
    if (signal?.aborted) break;
    const token = chunk.choices[0]?.delta?.content ?? '';
    if (token) {
      onDelta(token);
    }
  }
}

