'use client';

import { useState } from 'react';
import type { GenerationStatus } from '@/types/repurpose';
import { CopyButton } from './CopyButton';
import { ErrorBanner } from './ErrorBanner';
import { useEditDraft } from './useEditDraft';
import { Card, CardHeader, CardTitle, CardContent, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PostButton } from './PostButton';

interface LinkedInPostDisplayProps {
  generationStatus: GenerationStatus;
  streamingText: string;
  post: string | null;
  errorMessage: string | null;
  transcriptId: string;
  draftId: string | null;
  onRetry: (transcriptId: string) => void;
}

const LinkedInIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const LINKEDIN_LIMIT = 1300;

function CharCounter({ count }: { count: number }) {
  const colorClass =
    count > LINKEDIN_LIMIT
      ? 'text-destructive'
      : count >= 1200
        ? 'text-amber-500'
        : 'text-muted-foreground';

  return (
    <p className={`text-xs text-right mt-2 ${colorClass}`}>
      {count} / {LINKEDIN_LIMIT}
    </p>
  );
}

export function LinkedInPostDisplay({
  generationStatus,
  streamingText,
  post,
  errorMessage,
  transcriptId,
  draftId,
  onRetry,
}: LinkedInPostDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPost, setEditedPost] = useState('');
  const [originalPost, setOriginalPost] = useState('');
  const { saveDraft, isSaving, saveError, clearSaveError } = useEditDraft();

  if (generationStatus === 'idle') return null;

  if (generationStatus === 'generating') {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <LinkedInIcon />
            Drafting LinkedIn Post…
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="status"
            aria-live="polite"
            aria-label="Generating LinkedIn post, please wait"
            className="w-full bg-muted rounded-full h-1.5 overflow-hidden"
          >
            <div className="h-full bg-primary animate-pulse rounded-full w-full" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Drafting your post with Groq…
          </p>
        </CardContent>
      </Card>
    );
  }

  if (generationStatus === 'error') {
    return (
      <ErrorBanner
        message={errorMessage ?? 'Failed to generate LinkedIn post'}
        onRetry={() => onRetry(transcriptId)}
      />
    );
  }

  const isStreaming = generationStatus === 'streaming';
  const savedPost = post ?? '';
  const displayText = isStreaming ? streamingText : savedPost;
  const canEdit = generationStatus === 'completed' && draftId !== null;
  const activeText = isEditing ? editedPost : displayText;
  const hasChanges = isEditing && editedPost !== originalPost;

  function handleEnterEdit() {
    setOriginalPost(savedPost);
    setEditedPost(savedPost);
    clearSaveError();
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    clearSaveError();
  }

  function handleRevert() {
    setEditedPost(originalPost);
  }

  async function handleSaveAndExit() {
    if (!draftId) return;
    const content = JSON.stringify({ post: editedPost });
    const ok = await saveDraft(draftId, content);
    if (ok) {
      setIsEditing(false);
    }
  }

  function getCopyText() {
    return savedPost;
  }

  return (
    <Card aria-live="polite" aria-label="LinkedIn post generated">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <LinkedInIcon />
          {isStreaming ? 'Drafting LinkedIn Post…' : 'LinkedIn Post'}
        </CardTitle>
        {canEdit && (
          <CardAction>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
                  <Button variant="outline" size="sm" onClick={handleEnterEdit}>
                    Edit
                  </Button>
                  <PostButton draftId={draftId!} draftFormat="linkedin_post" />
                  <CopyButton getText={getCopyText} />
                </>
              )}
              {isEditing && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveAndExit} disabled={isSaving}>
                    {isSaving ? 'Saving…' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <>
            <Textarea
              value={editedPost}
              onChange={(e) => setEditedPost(e.target.value)}
              className="w-full min-h-[200px] resize-y text-sm leading-relaxed"
              aria-label="LinkedIn post text"
            />
            <CharCounter count={editedPost.length} />
            {hasChanges && (
              <button
                type="button"
                onClick={handleRevert}
                className="mt-2 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Revert to original
              </button>
            )}
            {saveError && (
              <p className="mt-2 text-sm text-destructive">{saveError}</p>
            )}
          </>
        ) : (
          <>
            <ScrollArea
              className="max-h-[60vh] sm:max-h-[40vh] md:max-h-[60vh]"
              aria-label="LinkedIn post text"
              aria-live="polite"
              tabIndex={0}
            >
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {activeText}
                {isStreaming && (
                  <span
                    className="inline-block w-[2px] h-[1em] bg-foreground animate-pulse ml-px align-text-bottom"
                    aria-hidden="true"
                  />
                )}
              </p>
            </ScrollArea>
            <CharCounter count={activeText.length} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

