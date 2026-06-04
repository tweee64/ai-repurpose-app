'use client';

import { useState, useCallback } from 'react';
import type { ScheduleDraftRequest, ScheduleDraftResponse } from '@/types/repurpose';
import type { GenerationErrorResponse } from '@/types/repurpose';

export interface UsePostDraftResult {
  isPosting: boolean;
  postError: string | null;
  isPosted: boolean;
  postDraft: (draftId: string) => Promise<boolean>;
  clearError: () => void;
}

export function usePostDraft(): UsePostDraftResult {
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [isPosted, setIsPosted] = useState(false);

  const postDraft = useCallback(async (draftId: string): Promise<boolean> => {
    setIsPosting(true);
    setPostError(null);

    const body: ScheduleDraftRequest = {
      scheduledFor: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };

    try {
      const res = await fetch(`/api/drafts/${draftId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data: GenerationErrorResponse = await res.json();
        if (res.status === 401) {
          setPostError('Authentication failed. Please reconnect your account in Settings.');
        } else {
          setPostError(data.error ?? 'Failed to post. Please try again.');
        }
        return false;
      }

      await res.json() as ScheduleDraftResponse;
      setIsPosted(true);
      return true;
    } catch {
      setPostError('Failed to post. Please try again.');
      return false;
    } finally {
      setIsPosting(false);
    }
  }, []);

  const clearError = useCallback(() => setPostError(null), []);

  return { isPosting, postError, isPosted, postDraft, clearError };
}
