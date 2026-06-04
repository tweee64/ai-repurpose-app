'use client';

import { useState } from 'react';
import type { GenerationErrorResponse } from '@/types/repurpose';

export interface UseEditDraftReturn {
  saveDraft: (draftId: string, content: string) => Promise<boolean>;
  isSaving: boolean;
  saveError: string | null;
  clearSaveError: () => void;
}

export function useEditDraft(): UseEditDraftReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function saveDraft(draftId: string, content: string): Promise<boolean> {
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const err = (await res.json()) as GenerationErrorResponse;
        setSaveError(err.error ?? 'Failed to save draft');
        return false;
      }

      return true;
    } catch {
      setSaveError('Network error — could not save draft');
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function clearSaveError() {
    setSaveError(null);
  }

  return { saveDraft, isSaving, saveError, clearSaveError };
}
