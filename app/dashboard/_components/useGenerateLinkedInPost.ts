'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { GenerationStatus, SseEvent } from '@/types/repurpose';

interface UseGenerateLinkedInPostState {
  generationStatus: GenerationStatus;
  streamingText: string;
  post: string | null;
  draftId: string | null;
  errorMessage: string | null;
  generate: (transcriptId: string) => void;
  retry: (transcriptId: string) => void;
}

export function useGenerateLinkedInPost(): UseGenerateLinkedInPostState {
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [streamingText, setStreamingText] = useState('');
  const [post, setPost] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const generate = useCallback((transcriptId: string) => {
    // Abort any in-flight stream before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGenerationStatus('generating');
    setStreamingText('');
    setPost(null);
    setDraftId(null);
    setErrorMessage(null);

    (async () => {
      let res: Response;
      try {
        res = await fetch('/api/repurpose/linkedin-post/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcriptId }),
          signal: controller.signal,
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setGenerationStatus('error');
        setErrorMessage('Network error. Please check your connection and try again.');
        return;
      }

      if (!res.ok || !res.body) {
        setGenerationStatus('error');
        setErrorMessage('Failed to connect to generation service. Please try again.');
        return;
      }

      setGenerationStatus('streaming');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });

          const messages = lineBuffer.split('\n\n');
          lineBuffer = messages.pop() ?? '';

          for (const message of messages) {
            const dataLine = message.split('\n').find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            const rawJson = dataLine.slice('data:'.length).trim();
            let event: SseEvent;
            try {
              event = JSON.parse(rawJson) as SseEvent;
            } catch {
              continue;
            }

            if (event.type === 'delta') {
              setStreamingText((prev) => prev + event.text);
            } else if (event.type === 'done') {
              setDraftId(event.draftId);
              setPost((prev) => {
                // Use accumulated streamingText captured in closure
                return prev;
              });
              setGenerationStatus('completed');
            } else if (event.type === 'error') {
              setGenerationStatus('error');
              setErrorMessage(event.message);
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setGenerationStatus('error');
        setErrorMessage('Connection lost. Please try again.');
      }
    })();
  }, []);

  // Sync streamingText → post on completion
  useEffect(() => {
    if (generationStatus === 'completed') {
      setPost(streamingText);
    }
  }, [generationStatus, streamingText]);

  const retry = useCallback(
    (transcriptId: string) => {
      generate(transcriptId);
    },
    [generate],
  );

  return {
    generationStatus,
    streamingText,
    post,
    draftId,
    errorMessage,
    generate,
    retry,
  };
}

