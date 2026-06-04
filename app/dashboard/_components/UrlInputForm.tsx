'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { UIJobStatus } from '@/types/transcription';

interface UrlInputFormProps {
  url: string;
  urlError: string | null;
  status: UIJobStatus;
  onUrlChange: (value: string) => void;
  onSubmit: () => void;
}

const isDisabled = (status: UIJobStatus) =>
  status === 'submitting' || status === 'downloading' || status === 'transcribing';

export function UrlInputForm({ url, urlError, status, onUrlChange, onSubmit }: UrlInputFormProps) {
  const disabled = isDisabled(status);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    onUrlChange(pasted.trim());
    e.preventDefault();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor="youtube-url" className="sr-only">
            YouTube URL
          </label>
          <Input
            id="youtube-url"
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onPaste={handlePaste}
            placeholder="Paste YouTube URL…"
            disabled={disabled}
            aria-invalid={urlError ? true : undefined}
            aria-describedby={urlError ? 'url-error' : undefined}
            className="h-10"
          />
          {urlError && (
            <p
              id="url-error"
              role="alert"
              className="mt-1 text-sm text-destructive"
            >
              {urlError}
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={disabled}
          aria-disabled={disabled}
          aria-label={disabled ? 'Transcription in progress' : 'Transcribe video'}
          size="lg"
          className="w-full sm:w-auto shrink-0"
        >
          {disabled ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
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
              Processing…
            </>
          ) : (
            'Transcribe'
          )}
        </Button>
      </div>
    </form>
  );
}
