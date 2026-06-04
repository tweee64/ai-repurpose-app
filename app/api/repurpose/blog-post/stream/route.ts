import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { streamBlogPost } from '@/lib/claude';
import { getCurrentUserId } from '@/lib/auth-session';

function sseEvent(eventName: string, data: unknown): string {
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest): Promise<Response> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return new Response(
      sseEvent('error', { type: 'error', message: 'Unauthorized', code: 'UNAUTHORIZED' }),
      { status: 401, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }

  let body: { transcriptId?: unknown };
  try {
    body = (await request.json()) as { transcriptId?: unknown };
  } catch {
    return new Response(
      sseEvent('error', { type: 'error', message: 'Invalid request body', code: 'INVALID_REQUEST' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }

  const transcriptId = typeof body?.transcriptId === 'string' ? body.transcriptId.trim() : '';
  if (!transcriptId) {
    return new Response(
      sseEvent('error', { type: 'error', message: 'transcriptId is required', code: 'INVALID_REQUEST' }),
      { status: 400, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }

  const transcript = await prisma.transcript.findUnique({ where: { id: transcriptId } });
  if (!transcript) {
    return new Response(
      sseEvent('error', { type: 'error', message: 'Transcript not found', code: 'TRANSCRIPT_NOT_FOUND' }),
      { status: 404, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }

  const encoder = new TextEncoder();
  const abortController = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = '';

      try {
        await streamBlogPost(
          transcript.text,
          (token) => {
            fullText += token;
            controller.enqueue(
              encoder.encode(sseEvent('delta', { type: 'delta', text: token })),
            );
          },
          abortController.signal,
        );

        // Persist draft after all tokens have been collected
        const draft = await prisma.draft.create({
          data: {
            userId,
            transcriptId: transcript.id,
            format: 'blog_post',
            content: JSON.stringify({ post: fullText }),
          },
        });

        controller.enqueue(
          encoder.encode(sseEvent('done', { type: 'done', draftId: draft.id })),
        );
      } catch (err) {
        console.error('[api/repurpose/blog-post/stream] Error:', err);
        controller.enqueue(
          encoder.encode(
            sseEvent('error', {
              type: 'error',
              message: 'Failed to generate blog post. Please try again.',
              code: 'GENERATION_ERROR',
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
