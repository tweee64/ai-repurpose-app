'use client';

import type { GenerationStatus } from '@/types/repurpose';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GenerateActionsBarProps {
  transcriptId: string;
  generationStatus: GenerationStatus;
  onGenerate: (transcriptId: string) => void;
  linkedInGenerationStatus: GenerationStatus;
  onGenerateLinkedIn: (transcriptId: string) => void;
  blogPostGenerationStatus: GenerationStatus;
  onGenerateBlogPost: (transcriptId: string) => void;
}

const SpinnerIcon = () => (
  <svg
    className="h-4 w-4 animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
    />
  </svg>
);

export function GenerateActionsBar({
  transcriptId,
  generationStatus,
  onGenerate,
  linkedInGenerationStatus,
  onGenerateLinkedIn,
  blogPostGenerationStatus,
  onGenerateBlogPost,
}: GenerateActionsBarProps) {
  const isGeneratingTwitter = generationStatus === 'generating' || generationStatus === 'streaming';
  const hasGeneratedTwitter = generationStatus === 'completed' || generationStatus === 'error';

  const isGeneratingLinkedIn = linkedInGenerationStatus === 'generating' || linkedInGenerationStatus === 'streaming';
  const hasGeneratedLinkedIn =
    linkedInGenerationStatus === 'completed' || linkedInGenerationStatus === 'error';

  const isGeneratingBlogPost = blogPostGenerationStatus === 'generating' || blogPostGenerationStatus === 'streaming';
  const hasGeneratedBlogPost =
    blogPostGenerationStatus === 'completed' || blogPostGenerationStatus === 'error';

  return (
    <Card>
      <CardContent className="flex gap-3 flex-wrap">
        <p className="w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Generate Content
        </p>

        <Button
          type="button"
          disabled={isGeneratingTwitter}
          aria-label={isGeneratingTwitter ? 'Generating Twitter thread, please wait' : undefined}
          onClick={() => onGenerate(transcriptId)}
          variant={isGeneratingTwitter ? 'default' : 'outline'}
          className="w-full sm:w-auto"
        >
          {isGeneratingTwitter ? (
            <>
              <SpinnerIcon />
              Generating…
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {hasGeneratedTwitter ? 'Regenerate Thread' : 'Twitter Thread'}
            </>
          )}
        </Button>

        <Button
          type="button"
          disabled={isGeneratingLinkedIn}
          aria-label={isGeneratingLinkedIn ? 'Generating LinkedIn post, please wait' : undefined}
          onClick={() => onGenerateLinkedIn(transcriptId)}
          variant={isGeneratingLinkedIn ? 'default' : 'outline'}
          className="w-full sm:w-auto"
        >
          {isGeneratingLinkedIn ? (
            <>
              <SpinnerIcon />
              Generating…
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              {hasGeneratedLinkedIn ? 'Regenerate Post' : 'LinkedIn Post'}
            </>
          )}
        </Button>

        <Button
          type="button"
          disabled={isGeneratingBlogPost}
          aria-label={isGeneratingBlogPost ? 'Generating blog post, please wait' : undefined}
          onClick={() => onGenerateBlogPost(transcriptId)}
          variant={isGeneratingBlogPost ? 'default' : 'outline'}
          className="w-full sm:w-auto"
        >
          {isGeneratingBlogPost ? (
            <>
              <SpinnerIcon />
              Generating…
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              {hasGeneratedBlogPost ? 'Regenerate Blog Post' : 'Blog Post'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

