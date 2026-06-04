'use client';

import { useState } from 'react';
import type { Tweet, GenerationStatus } from '@/types/repurpose';
import { EditableTweetCard } from './EditableTweetCard';
import { CopyButton } from './CopyButton';
import { ErrorBanner } from './ErrorBanner';
import { useEditDraft } from './useEditDraft';
import { Card, CardHeader, CardTitle, CardContent, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PostButton } from './PostButton';

interface TwitterThreadDisplayProps {
  generationStatus: GenerationStatus;
  partialTweets: Tweet[];
  tweets: Tweet[];
  errorMessage: string | null;
  transcriptId: string;
  draftId: string | null;
  onRetry: (transcriptId: string) => void;
}

const XIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export function TwitterThreadDisplay({
  generationStatus,
  partialTweets,
  tweets,
  errorMessage,
  transcriptId,
  draftId,
  onRetry,
}: TwitterThreadDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTweets, setEditedTweets] = useState<Tweet[]>([]);
  const [originalTweets, setOriginalTweets] = useState<Tweet[]>([]);
  // Tracks the last-saved content so read-only mode reflects edits without needing a parent state update
  const [savedTweets, setSavedTweets] = useState<Tweet[] | null>(null);
  const { saveDraft, isSaving, saveError, clearSaveError } = useEditDraft();

  if (generationStatus === 'idle') return null;

  if (generationStatus === 'generating') {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <XIcon />
            Generating Twitter Thread…
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="status"
            aria-live="polite"
            aria-label="Generating Twitter thread, please wait"
            className="w-full bg-muted rounded-full h-1.5 overflow-hidden"
          >
            <div className="h-full bg-primary animate-pulse rounded-full w-full" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Drafting your thread with Groq…
          </p>
        </CardContent>
      </Card>
    );
  }

  if (generationStatus === 'error') {
    return (
      <ErrorBanner
        message={errorMessage ?? 'Failed to generate thread'}
        onRetry={() => onRetry(transcriptId)}
      />
    );
  }

  const completedTweets = savedTweets ?? tweets;
  const displayTweets = generationStatus === 'completed' ? completedTweets : partialTweets;
  const isStreaming = generationStatus === 'streaming';
  const canEdit = generationStatus === 'completed' && draftId !== null;
  const activeTweets = isEditing ? editedTweets : displayTweets;

  const hasChanges =
    isEditing &&
    editedTweets.some((t, i) => t.text !== originalTweets[i]?.text);

  function handleEnterEdit() {
    const base = completedTweets;
    setOriginalTweets(base.map((t) => ({ ...t })));
    setEditedTweets(base.map((t) => ({ ...t })));
    clearSaveError();
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    clearSaveError();
  }

  function handleTweetChange(index: number, text: string) {
    setEditedTweets((prev) =>
      prev.map((t) => (t.index === index ? { ...t, text } : t))
    );
  }

  function handleRevert() {
    setEditedTweets(originalTweets.map((t) => ({ ...t })));
  }

  async function handleSaveAndExit() {
    if (!draftId) return;
    const content = JSON.stringify({ tweets: editedTweets });
    const ok = await saveDraft(draftId, content);
    if (ok) {
      setSavedTweets(editedTweets.map((t) => ({ ...t })));
      setIsEditing(false);
    }
  }

  function getCopyText() {
    return completedTweets.map((t) => t.text).join('\n\n');
  }

  // completed or streaming
  return (
    <Card aria-live="polite" aria-label="Twitter thread generated">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <XIcon />
          {isStreaming ? 'Generating Twitter Thread…' : 'Twitter Thread'}
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {displayTweets.length} tweet{displayTweets.length !== 1 ? 's' : ''}
            </Badge>
            {canEdit && !isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={handleEnterEdit}>
                  Edit
                </Button>
                <PostButton draftId={draftId!} draftFormat="twitter_thread" />
                <CopyButton getText={getCopyText} />
              </>
            )}
            {canEdit && isEditing && (
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
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {activeTweets.map((tweet) => (
            <EditableTweetCard
              key={tweet.index}
              tweet={tweet}
              isEditing={isEditing}
              onChange={handleTweetChange}
            />
          ))}
          {isStreaming && (
            <div className="px-4 py-3" aria-hidden="true">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
        </div>
        {isEditing && (
          <div className="px-5 py-3 flex flex-col gap-2">
            {hasChanges && (
              <button
                type="button"
                onClick={handleRevert}
                className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground self-start"
              >
                Revert to original
              </button>
            )}
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

