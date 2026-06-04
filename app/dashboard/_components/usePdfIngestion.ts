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
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export interface PdfIngestionState {
  file: File | null;
  uiStatus: UIJobStatus;
  jobId: string | null;
  transcript: Transcript | null;
  errorMessage: string | null;
}

export function usePdfIngestion() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
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

  const selectFile = useCallback((selected: File | null) => {
    if (!selected) {
      setFile(null);
      setFileError(null);
      return;
    }

    if (selected.type !== 'application/pdf') {
      setFileError('Only PDF files are accepted');
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setFileError('File exceeds the 20 MB limit');
      setFile(null);
      return;
    }

    setFileError(null);
    setFile(selected);
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
    if (!file) return;

    setErrorMessage(null);
    setUiStatus('submitting');

    try {
      const form = new FormData();
      form.append('sourceType', 'pdf');
      form.append('file', file);

      const res = await fetch('/api/ingestion', { method: 'POST', body: form });
      const data: IngestionJobResponse | ApiErrorResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as ApiErrorResponse).error ?? 'Upload failed');
      }

      const { jobId: id } = data as IngestionJobResponse;
      setJobId(id);
      setUiStatus('processing');

      intervalRef.current = setInterval(() => pollJobStatus(id), POLL_INTERVAL_MS);
    } catch (err) {
      setUiStatus('failed');
      setErrorMessage(
        err instanceof Error ? err.message : 'Upload failed. Please try again.',
      );
    }
  }, [file, pollJobStatus]);

  const reset = useCallback(() => {
    stopPolling();
    setFile(null);
    setFileError(null);
    setJobId(null);
    setUiStatus('idle');
    setTranscript(null);
    setErrorMessage(null);
    pollRetries.current = 0;
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    file,
    fileError,
    uiStatus,
    jobId,
    transcript,
    errorMessage,
    selectFile,
    submit,
    reset,
  } as const;
}
