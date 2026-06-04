'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePostDraft } from './usePostDraft';
import type { DraftFormat } from '@/types/repurpose';
import type { ConnectedAccountsResponse } from '@/types/connected-account';

interface PostNowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPosted: () => void;
  draftId: string;
  draftFormat: DraftFormat;
}

const PLATFORM_MAP: Record<string, 'twitter' | 'linkedin'> = {
  twitter_thread: 'twitter',
  linkedin_post: 'linkedin',
};

const PLATFORM_LABEL: Record<string, string> = {
  twitter: 'Twitter / X',
  linkedin: 'LinkedIn',
};

export function PostNowDialog({ isOpen, onClose, onPosted, draftId, draftFormat }: PostNowDialogProps) {
  const platform = PLATFORM_MAP[draftFormat];
  const platformLabel = PLATFORM_LABEL[platform] ?? platform;

  // Start as loading=true so the first open renders the skeleton immediately
  const [handle, setHandle] = useState<string | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [noAccount, setNoAccount] = useState(false);

  const { isPosting, postError, postDraft, clearError } = usePostDraft();

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    fetch('/api/settings/connected-accounts')
      .then((res) => res.json())
      .then((data: ConnectedAccountsResponse) => {
        if (cancelled) return;
        const account = data.accounts?.find((a) => a.platform === platform && !a.tokenInvalid);
        if (account) {
          setHandle(account.handle);
          setNoAccount(false);
        } else {
          setHandle(null);
          setNoAccount(true);
        }
        setIsLoadingAccount(false);
      })
      .catch(() => {
        if (!cancelled) {
          setNoAccount(true);
          setIsLoadingAccount(false);
        }
      });

    return () => { cancelled = true; };
  }, [isOpen, platform]);

  function handleOpenChange(open: boolean) {
    if (!open) {
      clearError();
      // Reset for next open
      setHandle(null);
      setNoAccount(false);
      setIsLoadingAccount(true);
      onClose();
    }
  }

  async function handlePostNow() {
    const success = await postDraft(draftId);
    if (success) {
      toast.success('Posted successfully!');
      onPosted();
    } else if (postError) {
      toast.error(postError);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Post to {platformLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isLoadingAccount ? (
            <>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </>
          ) : noAccount ? (
            <div role="alert" className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">No {platformLabel} account connected.</p>
                <p className="text-muted-foreground mt-1">
                  Go to Settings to connect your account before posting.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Posting as: <span className="font-medium text-foreground">{handle}</span>
              </p>
              <p className="text-sm text-foreground">
                This will publish your {draftFormat === 'twitter_thread' ? 'thread' : 'post'}{' '}
                immediately to {platformLabel}.
              </p>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {noAccount ? (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button variant="default" size="sm" asChild>
                <a href="/settings">Go to Settings →</a>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isPosting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePostNow}
                disabled={isPosting || isLoadingAccount}
                aria-disabled={isPosting}
              >
                {isPosting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Posting…
                  </>
                ) : (
                  'Post Now →'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
