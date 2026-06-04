'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { GenerationStatus } from '@/types/repurpose';
import { CopyButton } from './CopyButton';
import { ErrorBanner } from './ErrorBanner';
import { useEditDraft } from './useEditDraft';
import { Card, CardHeader, CardTitle, CardContent, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';

interface BlogPostDisplayProps {
  generationStatus: GenerationStatus;
  streamingText: string;
  post: string | null;
  errorMessage: string | null;
  transcriptId: string;
  draftId: string | null;
  onRetry: (transcriptId: string) => void;
}

export function BlogPostDisplay({
  generationStatus,
  streamingText,
  post,
  errorMessage,
  transcriptId,
  draftId,
  onRetry,
}: BlogPostDisplayProps) {
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
            <FileText className="h-4 w-4" aria-hidden="true" />
            Drafting Blog Post…
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            role="status"
            aria-live="polite"
            aria-label="Generating blog post, please wait"
            className="w-full bg-muted rounded-full h-1.5 overflow-hidden"
          >
            <div className="h-full bg-primary animate-pulse rounded-full w-full" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Drafting your blog post with Groq…
          </p>
        </CardContent>
      </Card>
    );
  }

  if (generationStatus === 'error') {
    return (
      <ErrorBanner
        message={errorMessage ?? 'Failed to generate blog post'}
        onRetry={() => onRetry(transcriptId)}
      />
    );
  }

  const isStreaming = generationStatus === 'streaming';
  const savedPost = post ?? '';
  const displayText = isStreaming ? streamingText : savedPost;
  const canEdit = generationStatus === 'completed' && draftId !== null;

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
    <Card aria-live="polite" aria-label="Blog post generated">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4" aria-hidden="true" />
          {isStreaming ? 'Drafting Blog Post…' : 'Blog Post'}
        </CardTitle>
        {canEdit && (
          <CardAction>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnterEdit}
                    aria-label="Edit blog post"
                  >
                    Edit
                  </Button>
                  <CopyButton getText={getCopyText} />
                </>
              )}
              {isEditing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                    aria-label="Cancel editing blog post"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAndExit}
                    disabled={isSaving || !draftId}
                    aria-label="Save blog post changes"
                  >
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
              className="w-full h-[500px] resize-y font-mono text-sm leading-relaxed"
              aria-label="Blog post markdown text"
            />
            {editedPost !== originalPost && (
              <button
                type="button"
                onClick={() => setEditedPost(originalPost)}
                className="mt-2 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Revert to original
              </button>
            )}
            {saveError && (
              <p className="mt-2 text-sm text-destructive">{saveError}</p>
            )}
          </>
        ) : isStreaming ? (
          <ScrollArea
            className="h-[500px]"
            aria-label="Blog post streaming content"
            aria-live="polite"
            tabIndex={0}
          >
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {displayText}
              <span
                className="inline-block w-[2px] h-[1em] bg-foreground animate-pulse ml-px align-text-bottom"
                aria-hidden="true"
              />
            </p>
          </ScrollArea>
        ) : (
          <ScrollArea
            className="h-[500px]"
            aria-label="Blog post content"
            tabIndex={0}
          >
            <div role="status" className="prose prose-sm max-w-none text-foreground">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mt-0 mb-3">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-semibold mt-6 mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-medium mt-4 mb-1">{children}</h3>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 text-muted-foreground text-sm my-3">
                      {children}
                    </blockquote>
                  ),
                  p: ({ children }) => (
                    <p className="mb-3 leading-relaxed">{children}</p>
                  ),
                }}
              >
                {displayText}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
