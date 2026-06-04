'use client';

import { useTranscriptionJob } from './_components/useTranscriptionJob';
import { useBlogIngestion } from './_components/useBlogIngestion';
import { usePdfIngestion } from './_components/usePdfIngestion';
import { useGenerateTwitterThread } from './_components/useGenerateTwitterThread';
import { useGenerateLinkedInPost } from './_components/useGenerateLinkedInPost';
import { useGenerateBlogPost } from './_components/useGenerateBlogPost';
import { ContentIngestionForm } from './_components/ContentIngestionForm';
import { TranscriptionJobCard } from './_components/TranscriptionJobCard';
import { TranscriptDisplay } from './_components/TranscriptDisplay';
import { ErrorBanner } from './_components/ErrorBanner';
import { GenerateActionsBar } from './_components/GenerateActionsBar';
import { TwitterThreadDisplay } from './_components/TwitterThreadDisplay';
import { LinkedInPostDisplay } from './_components/LinkedInPostDisplay';
import { BlogPostDisplay } from './_components/BlogPostDisplay';
import { SignOutButton } from './_components/SignOutButton';
import type { JobStatus, UIJobStatus } from '@/types/transcription';

const ACTIVE_STATUSES: UIJobStatus[] = [
  'submitting',
  'pending',
  'downloading',
  'transcribing',
  'processing',
];

export default function DashboardPage() {
  const {
    url: youtubeUrl,
    setUrl: setYoutubeUrl,
    urlError: youtubeUrlError,
    status: youtubeStatus,
    transcript: youtubeTranscriptText,
    transcriptId: youtubeTranscriptId,
    errorMessage: youtubeError,
    submitUrl,
    resetJob: resetYoutube,
  } = useTranscriptionJob();

  const {
    url: blogUrl,
    setUrl: setBlogUrl,
    urlError: blogUrlError,
    uiStatus: blogStatus,
    transcript: blogTranscript,
    errorMessage: blogError,
    submit: submitBlog,
    reset: resetBlog,
  } = useBlogIngestion();

  const {
    file: pdfFile,
    fileError: pdfFileError,
    uiStatus: pdfStatus,
    transcript: pdfTranscript,
    errorMessage: pdfError,
    selectFile: selectPdfFile,
    submit: submitPdf,
    reset: resetPdf,
  } = usePdfIngestion();

  const {
    generationStatus,
    partialTweets,
    tweets,
    draftId: twitterDraftId,
    errorMessage: generationError,
    generate,
    retry,
  } = useGenerateTwitterThread();

  const {
    generationStatus: linkedInGenerationStatus,
    streamingText,
    post,
    draftId: linkedInDraftId,
    errorMessage: linkedInError,
    generate: generateLinkedIn,
    retry: retryLinkedIn,
  } = useGenerateLinkedInPost();

  const {
    generationStatus: blogPostGenerationStatus,
    streamingText: blogStreamingText,
    post: blogPost,
    draftId: blogDraftId,
    errorMessage: blogPostError,
    generate: generateBlogPost,
    retry: retryBlogPost,
  } = useGenerateBlogPost();

  // Derive which source is active and unify status/transcript for downstream UI
  const youtubeActive = ACTIVE_STATUSES.includes(youtubeStatus) || youtubeStatus === 'completed' || youtubeStatus === 'failed';
  const blogActive = ACTIVE_STATUSES.includes(blogStatus) || blogStatus === 'completed' || blogStatus === 'failed';
  const pdfActive = ACTIVE_STATUSES.includes(pdfStatus) || pdfStatus === 'completed' || pdfStatus === 'failed';

  // Active ingestion: first non-idle source
  const activeStatus: UIJobStatus = blogActive
    ? blogStatus
    : pdfActive
      ? pdfStatus
      : youtubeStatus;

  const activeTranscriptText = blogActive
    ? (blogTranscript?.text ?? null)
    : pdfActive
      ? (pdfTranscript?.text ?? null)
      : youtubeTranscriptText;

  const activeTranscriptId = blogActive
    ? (blogTranscript?.id ?? null)
    : pdfActive
      ? (pdfTranscript?.id ?? null)
      : youtubeTranscriptId;

  const activeError = blogActive ? blogError : pdfActive ? pdfError : youtubeError;

  const activeReset = blogActive ? resetBlog : pdfActive ? resetPdf : resetYoutube;

  const isActive = ACTIVE_STATUSES.includes(activeStatus);
  const isFailed = activeStatus === 'failed';
  const isCompleted = activeStatus === 'completed';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="font-semibold text-foreground">AI Repurpose</span>
          <SignOutButton />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Heading */}
        <h1 className="text-2xl font-semibold text-foreground mb-8">
          Repurpose Your Content
        </h1>

        <div className="space-y-4">
          {/* Multi-source ingestion form */}
          <ContentIngestionForm
            youtubeUrl={youtubeUrl}
            youtubeUrlError={youtubeUrlError}
            youtubeStatus={youtubeStatus}
            onYoutubeUrlChange={setYoutubeUrl}
            onYoutubeSubmit={submitUrl}
            blogUrl={blogUrl}
            blogUrlError={blogUrlError}
            blogStatus={blogStatus}
            onBlogUrlChange={setBlogUrl}
            onBlogSubmit={submitBlog}
            pdfFile={pdfFile}
            pdfFileError={pdfFileError}
            pdfStatus={pdfStatus}
            onPdfFileSelect={selectPdfFile}
            onPdfSubmit={submitPdf}
          />

          {/* Error Banner */}
          {isFailed && activeError && (
            <ErrorBanner message={activeError} onRetry={activeReset} />
          )}

          {/* Progress Card */}
          {isActive && activeStatus !== 'submitting' && activeStatus !== 'idle' && (
            <TranscriptionJobCard status={activeStatus as JobStatus} />
          )}

          {/* Transcript */}
          {isCompleted && activeTranscriptText && (
            <TranscriptDisplay transcript={activeTranscriptText} />
          )}

          {/* Generate Content */}
          {isCompleted && activeTranscriptText && activeTranscriptId && (
            <GenerateActionsBar
              transcriptId={activeTranscriptId}
              generationStatus={generationStatus}
              onGenerate={generate}
              linkedInGenerationStatus={linkedInGenerationStatus}
              onGenerateLinkedIn={generateLinkedIn}
              blogPostGenerationStatus={blogPostGenerationStatus}
              onGenerateBlogPost={generateBlogPost}
            />
          )}

          {/* Twitter Thread */}
          {isCompleted && activeTranscriptId && generationStatus !== 'idle' && (
            <TwitterThreadDisplay
              generationStatus={generationStatus}
              partialTweets={partialTweets}
              tweets={tweets}
              draftId={twitterDraftId}
              errorMessage={generationError}
              transcriptId={activeTranscriptId}
              onRetry={retry}
            />
          )}

          {/* LinkedIn Post */}
          {isCompleted && activeTranscriptId && linkedInGenerationStatus !== 'idle' && (
            <LinkedInPostDisplay
              generationStatus={linkedInGenerationStatus}
              streamingText={streamingText}
              post={post}
              draftId={linkedInDraftId}
              errorMessage={linkedInError}
              transcriptId={activeTranscriptId}
              onRetry={retryLinkedIn}
            />
          )}

          {/* Blog Post */}
          {isCompleted && activeTranscriptId && (
            <BlogPostDisplay
              generationStatus={blogPostGenerationStatus}
              streamingText={blogStreamingText}
              post={blogPost}
              draftId={blogDraftId}
              errorMessage={blogPostError}
              transcriptId={activeTranscriptId}
              onRetry={retryBlogPost}
            />
          )}
        </div>
      </main>
    </div>
  );
}
