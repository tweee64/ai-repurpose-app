'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  UIJobStatus,
  JobStatusResponse,
  ApiErrorResponse,
  Transcript,
} from '@/types/transcription';
import type { IngestionJobResponse } from '@/types/ingestion';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_RETRIES = 3;

export interface BlogIngestionState {
  url: string;
  uiStatus: UIJobStatus;
  jobId: string | null;
  transcript: Transcript | null;
  errorMessage: string | null;
}

export function useBlogIngestion() {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [uiStatus, setUiStatus] = useState<UIJobStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
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
        const res = await fetch(`/api/ingestion/${id}`);
        const data: JobStatusResponse | ApiErrorResponse = await res.json();

        if (!res.ok) {
          throw new Error((data as ApiErrorResponse).error ?? 'Failed to fetch job status');
        }

        const { job, transcript: t } = data as JobStatusResponse;
        setUiStatus(job.status);

        if (job.status === 'completed' && t) {
          setTranscript(t);
          stopPolling();
        } else if (job.status === 'failed') {
          setErrorMessage(job.errorMessage ?? 'Ingestion failed. Please try again.');
          stopPolling();
        }

        pollRetries.current = 0;
      } catch {
        pollRetries.current += 1;
        if (pollRetries.current >= MAX_POLL_RETRIES) {
          setErrorMessage('Unable to reach the server. Please refresh and try again.');
          setUiStatus('failed');
          stopPolling();
        }
      }
    },
    [stopPolling],
  );

  const submit = useCallback(async () => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setUrlError('Please enter a URL');
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setUrlError('Please enter a valid URL');
      return;
    }

    setUrlError(null);
    setErrorMessage(null);
    setUiStatus('submitting');

    try {
      const form = new FormData();
      form.append('sourceType', 'blog_url');
      form.append('url', trimmedUrl);

      const res = await fetch('/api/ingestion', { method: 'POST', body: form });
      const data: IngestionJobResponse | ApiErrorResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as ApiErrorResponse).error ?? 'Submission failed');
      }

      const { jobId: id } = data as IngestionJobResponse;
      setJobId(id);
      setUiStatus('processing');

      intervalRef.current = setInterval(() => pollJobStatus(id), POLL_INTERVAL_MS);
    } catch (err) {
      setUiStatus('failed');
      setErrorMessage(
        err instanceof Error ? err.message : 'Submission failed. Please try again.',
      );
    }
  }, [url, pollJobStatus]);

  const reset = useCallback(() => {
    stopPolling();
    setUrl('');
    setUrlError(null);
    setJobId(null);
    setUiStatus('idle');
    setTranscript(null);
    setErrorMessage(null);
    pollRetries.current = 0;
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    url,
    setUrl,
    urlError,
    uiStatus,
    jobId,
    transcript,
    errorMessage,
    submit,
    reset,
  } as const;
}
