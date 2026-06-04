'use client';

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UIJobStatus } from '@/types/transcription';
import type { useBlogIngestion } from './useBlogIngestion';
import type { usePdfIngestion } from './usePdfIngestion';

type Tab = 'youtube' | 'blog' | 'pdf';

interface ContentIngestionFormProps {
  // YouTube tab
  youtubeUrl: string;
  youtubeUrlError: string | null;
  youtubeStatus: UIJobStatus;
  onYoutubeUrlChange: (value: string) => void;
  onYoutubeSubmit: () => void;

  // Blog tab
  blogUrl: string;
  blogUrlError: string | null;
  blogStatus: UIJobStatus;
  onBlogUrlChange: (value: string) => void;
  onBlogSubmit: () => void;

  // PDF tab
  pdfFile: File | null;
  pdfFileError: string | null;
  pdfStatus: UIJobStatus;
  onPdfFileSelect: ReturnType<typeof usePdfIngestion>['selectFile'];
  onPdfSubmit: () => void;
}

const isProcessing = (status: UIJobStatus) =>
  status === 'submitting' ||
  status === 'downloading' ||
  status === 'transcribing' ||
  status === 'processing' ||
  status === 'pending';

function SpinnerIcon() {
  return (
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
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContentIngestionForm({
  youtubeUrl,
  youtubeUrlError,
  youtubeStatus,
  onYoutubeUrlChange,
  onYoutubeSubmit,
  blogUrl,
  blogUrlError,
  blogStatus,
  onBlogUrlChange,
  onBlogSubmit,
  pdfFile,
  pdfFileError,
  pdfStatus,
  onPdfFileSelect,
  onPdfSubmit,
}: ContentIngestionFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>('youtube');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  // ── YouTube tab handlers ────────────────────────────────────────────────────
  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onYoutubeSubmit();
  };

  const handleYoutubePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    onYoutubeUrlChange(e.clipboardData.getData('text').trim());
    e.preventDefault();
  };

  // ── Blog tab handlers ────────────────────────────────────────────────────────
  const handleBlogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBlogSubmit();
  };

  // ── PDF tab handlers ─────────────────────────────────────────────────────────
  const handlePdfSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPdfSubmit();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onPdfFileSelect(e.target.files?.[0] ?? null);
    // Reset input so re-selecting the same file fires onChange again
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onPdfFileSelect(dropped);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const pdfBusy = isProcessing(pdfStatus);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'youtube', label: 'YouTube URL' },
    { id: 'blog', label: 'Blog URL' },
    { id: 'pdf', label: 'PDF Upload' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Content source"
        className="flex border-b mb-6"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary -mb-px'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── YouTube tab ────────────────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id="tabpanel-youtube"
        aria-labelledby="tab-youtube"
        hidden={activeTab !== 'youtube'}
      >
        <form onSubmit={handleYoutubeSubmit} noValidate>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              <label htmlFor="youtube-url" className="sr-only">
                YouTube URL
              </label>
              <Input
                id="youtube-url"
                type="url"
                value={youtubeUrl}
                onChange={(e) => onYoutubeUrlChange(e.target.value)}
                onPaste={handleYoutubePaste}
                placeholder="Paste YouTube URL…"
                disabled={isProcessing(youtubeStatus)}
                aria-invalid={youtubeUrlError ? true : undefined}
                aria-describedby={youtubeUrlError ? 'youtube-url-error' : undefined}
                className="h-10"
              />
              {youtubeUrlError && (
                <p id="youtube-url-error" role="alert" className="mt-1 text-sm text-destructive">
                  {youtubeUrlError}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isProcessing(youtubeStatus)}
              aria-disabled={isProcessing(youtubeStatus)}
              size="lg"
              className="w-full sm:w-auto shrink-0"
            >
              {isProcessing(youtubeStatus) ? (
                <>
                  <SpinnerIcon />
                  Processing…
                </>
              ) : (
                'Transcribe'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* ── Blog URL tab ───────────────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id="tabpanel-blog"
        aria-labelledby="tab-blog"
        hidden={activeTab !== 'blog'}
      >
        <form onSubmit={handleBlogSubmit} noValidate>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              <label htmlFor="blog-url" className="sr-only">
                Blog or article URL
              </label>
              <Input
                id="blog-url"
                type="url"
                value={blogUrl}
                onChange={(e) => onBlogUrlChange(e.target.value)}
                placeholder="https://example.com/article"
                disabled={isProcessing(blogStatus)}
                aria-invalid={blogUrlError ? true : undefined}
                aria-describedby={blogUrlError ? 'blog-url-error' : undefined}
                className="h-10"
              />
              {blogUrlError && (
                <p id="blog-url-error" role="alert" className="mt-1 text-sm text-destructive">
                  {blogUrlError}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isProcessing(blogStatus) || !blogUrl.trim()}
              aria-disabled={isProcessing(blogStatus) || !blogUrl.trim()}
              size="lg"
              className="w-full sm:w-auto shrink-0"
            >
              {isProcessing(blogStatus) ? (
                <>
                  <SpinnerIcon />
                  Processing…
                </>
              ) : (
                'Extract'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* ── PDF Upload tab ─────────────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id="tabpanel-pdf"
        aria-labelledby="tab-pdf"
        hidden={activeTab !== 'pdf'}
      >
        <form onSubmit={handlePdfSubmit} noValidate>
          <div className="flex flex-col gap-4">
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop a PDF here or click to browse"
              onClick={() => !pdfBusy && fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !pdfBusy) {
                  fileInputRef.current?.click();
                }
              }}
              onDrop={!pdfBusy ? handleDrop : undefined}
              onDragOver={!pdfBusy ? handleDragOver : undefined}
              onDragLeave={!pdfBusy ? handleDragLeave : undefined}
              className={cn(
                'h-32 w-full rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer',
                pdfFile
                  ? 'border-primary bg-primary/5'
                  : isDragOver
                    ? 'border-primary/70 bg-primary/10 scale-[1.01]'
                    : 'border-muted-foreground/25 hover:border-primary/50',
                pdfBusy && 'cursor-not-allowed opacity-60',
              )}
            >
              {pdfFile ? (
                <div className="flex items-center gap-3 px-4 w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-primary shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{pdfFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(pdfFile.size)}</p>
                  </div>
                  {!pdfBusy && (
                    <button
                      type="button"
                      aria-label="Remove selected file"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPdfFileSelect(null);
                      }}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Drop a PDF here, or{' '}
                    <span className="text-primary font-medium">click to browse</span>
                  </p>
                </>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              tabIndex={-1}
              onChange={handleFileInputChange}
              aria-hidden="true"
            />

            {/* File validation error */}
            {pdfFileError && (
              <p role="alert" className="text-sm text-destructive">
                {pdfFileError}
              </p>
            )}

            <Button
              type="submit"
              disabled={pdfBusy || !pdfFile}
              aria-disabled={pdfBusy || !pdfFile}
              size="lg"
              className="w-full sm:w-auto sm:self-end"
            >
              {pdfBusy ? (
                <>
                  <SpinnerIcon />
                  Processing…
                </>
              ) : (
                'Upload & Extract'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
