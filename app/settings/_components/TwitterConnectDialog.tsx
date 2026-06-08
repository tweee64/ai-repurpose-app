'use client';

import { TriangleAlert, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TwitterConnectDialogProps {
  variant?: 'connect' | 'reconnect';
}

export function TwitterConnectDialog({ variant = 'connect' }: TwitterConnectDialogProps) {
  const isConnect = variant === 'connect';

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant={isConnect ? 'default' : 'outline'}
            size="sm"
            className={
              isConnect
                ? 'shrink-0 bg-black hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100'
                : undefined
            }
            aria-label={
              isConnect ? 'Connect X / Twitter account' : 'Reconnect X / Twitter account'
            }
          />
        }
      >
        {isConnect ? 'Connect X / Twitter' : 'Reconnect'}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connect X / Twitter</DialogTitle>
          <DialogDescription>
            Connect your X account to schedule and publish posts directly.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-start gap-3">
            <TriangleAlert
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Before you continue
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You must already be logged in to X in this browser. If you&apos;re not, the
                authorization screen may appear blank.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://twitter.com/login"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open X to log in, opens in a new tab"
            >
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Open X to log in
            </a>
          </Button>
          <span className="text-xs text-gray-500 dark:text-gray-400">Opens in a new tab</span>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" size="sm" />}>Cancel</DialogClose>
          <Button
            variant="default"
            size="sm"
            className="bg-black hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100"
            aria-label="Continue to connect X / Twitter account"
            onClick={() => {
              window.location.href = '/api/auth/twitter';
            }}
          >
            Continue to Connect →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
