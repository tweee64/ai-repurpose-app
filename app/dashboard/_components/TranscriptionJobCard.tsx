'use client';

import type { JobStatus } from '@/types/transcription';
import { Card, CardContent } from '@/components/ui/card';

interface TranscriptionJobCardProps {
  status: JobStatus;
}

const statusLabel: Record<string, string> = {
  pending: 'Preparing…',
  downloading: 'Extracting audio…',
  transcribing: 'Transcribing…',
  processing: 'Extracting content…',
};

export function TranscriptionJobCard({ status }: TranscriptionJobCardProps) {
  const label = statusLabel[status] ?? 'Processing…';
  const isLongRunning = status === 'downloading' || status === 'transcribing';

  return (
    <Card>
      <CardContent
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <div className="flex items-center gap-3 mb-3">
          <svg
            className="animate-spin h-5 w-5 text-primary shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>

        <div
          className="w-full h-1.5 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Transcription progress"
        >
          <div className="h-full w-1/3 rounded-full bg-primary animate-[indeterminate_1.5s_ease-in-out_infinite]" />
        </div>

        {isLongRunning && (
          <p className="mt-2 text-xs text-muted-foreground">
            Estimated time: ~2 min for a 30-min video
          </p>
        )}
      </CardContent>
    </Card>
  );
}
