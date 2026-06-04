'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { isValidYouTubeUrl } from '@/lib/youtube-url';
import type {
  UIJobStatus,
  JobStatusResponse,
  SubmitUrlResponse,
  ApiErrorResponse,
} from '@/types/transcription';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_RETRIES = 3;

export function useTranscriptionJob() {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<UIJobStatus>('idle');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pollRetries = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/transcription/${id}`);
        const data: JobStatusResponse | ApiErrorResponse = await res.json();

        if (!res.ok) {
          throw new Error((data as ApiErrorResponse).error ?? 'Failed to fetch job status');
        }

        const { job, transcript: t } = data as JobStatusResponse;
        setStatus(job.status);

        if (job.status === 'completed' && t) {
          setTranscript(t.text);
          setTranscriptId(t.id);
          stopPolling();
        } else if (job.status === 'failed') {
          setErrorMessage(job.errorMessage ?? 'Transcription failed. Please try again.');
          stopPolling();
        }

        pollRetries.current = 0;
      } catch {
        pollRetries.current += 1;
        if (pollRetries.current >= MAX_POLL_RETRIES) {
          setErrorMessage('Unable to reach the server. Please refresh and try again.');
          setStatus('failed');
          stopPolling();
        }
      }
    },
    [stopPolling],
  );

  const submitUrl = useCallback(async () => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setUrlError('Please enter a YouTube URL');
      return;
    }
    if (!isValidYouTubeUrl(trimmedUrl)) {
      setUrlError('Please enter a valid YouTube URL');
      return;
    }

    setUrlError(null);
    setErrorMessage(null);
    setStatus('submitting');

    try {
      const res = await fetch('/api/transcription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data: SubmitUrlResponse | ApiErrorResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as ApiErrorResponse).error ?? 'Submission failed');
      }

      const { jobId: id } = data as SubmitUrlResponse;
      setJobId(id);
      setStatus('downloading');

      // Begin polling every 3 seconds
      intervalRef.current = setInterval(() => pollJobStatus(id), POLL_INTERVAL_MS);
    } catch (err) {
      setStatus('failed');
      setErrorMessage(
        err instanceof Error ? err.message : 'Submission failed. Please try again.',
      );
    }
  }, [url, pollJobStatus]);

  const resetJob = useCallback(() => {
    stopPolling();
    setUrl('');
    setUrlError(null);
    setJobId(null);
    setStatus('idle');
    setTranscript(null);
    setTranscriptId(null);
    setErrorMessage(null);
    pollRetries.current = 0;
  }, [stopPolling]);

  // Cleanup polling interval on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    url,
    setUrl,
    urlError,
    jobId,
    status,
    transcript,
    transcriptId,
    errorMessage,
    submitUrl,
    resetJob,
  } as const;
}
