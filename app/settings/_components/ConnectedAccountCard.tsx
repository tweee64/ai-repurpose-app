'use client';

import { useState } from 'react';
import { X as Twitter } from 'lucide-react';

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      width="16"
      height="16"
    >
      <path d="M19 3A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H19M18.5 18.5V13.2A3.26 3.26 0 0 0 15.24 9.94C14.39 9.94 13.4 10.46 12.92 11.24V10.13H10.13V18.5H12.92V13.57A1.46 1.46 0 0 1 14.38 12.11A1.46 1.46 0 0 1 15.84 13.57V18.5H18.5M6.88 8.56A1.68 1.68 0 0 0 8.56 6.88C8.56 5.95 7.81 5.19 6.88 5.19A1.69 1.69 0 0 0 5.19 6.88C5.19 7.81 5.95 8.56 6.88 8.56M8.27 18.5V10.13H5.5V18.5H8.27Z" />
    </svg>
  );
}
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TwitterConnectDialog } from './TwitterConnectDialog';
import type { ConnectedAccountSummary } from '@/types/connected-account';

interface ConnectedAccountCardProps {
  account: ConnectedAccountSummary;
  onDisconnect: (accountId: string) => Promise<void>;
  isDisconnecting: boolean;
}

const PLATFORM_META = {
  twitter: {
    label: 'X / Twitter',
    Icon: Twitter,
    reconnectHref: '/api/auth/twitter',
  },
  linkedin: {
    label: 'LinkedIn',
    Icon: LinkedinIcon,
    reconnectHref: '/api/auth/linkedin',
  },
} as const;

export function ConnectedAccountCard({
  account,
  onDisconnect,
  isDisconnecting,
}: ConnectedAccountCardProps) {
  const [showDialog, setShowDialog] = useState(false);

  const meta = PLATFORM_META[account.platform] ?? {
    label: account.platform,
    Icon: Twitter,
    reconnectHref: '/settings',
  };
  const { label, Icon, reconnectHref } = meta;

  async function handleConfirmDisconnect() {
    try {
      await onDisconnect(account.id);
      toast.success('Account disconnected.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect account.');
    } finally {
      setShowDialog(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 md:p-5">
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            className="h-5 w-5 shrink-0 text-gray-600 dark:text-gray-400"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">{account.handle}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {account.tokenInvalid ? (
            <>
              <Badge
                variant="outline"
                className="text-amber-600 border-amber-600"
                role="status"
              >
                Token expired
              </Badge>
              {account.platform === 'twitter' ? (
                <TwitterConnectDialog variant="reconnect" />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  aria-label={`Reconnect ${label} account ${account.handle}`}
                >
                  <a href={reconnectHref}>Reconnect</a>
                </Button>
              )}
            </>
          ) : (
            <>
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
                role="status"
              >
                Connected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => setShowDialog(true)}
                disabled={isDisconnecting}
                aria-label={`Disconnect ${label} account ${account.handle}`}
              >
                Disconnect
              </Button>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {account.handle}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the {label} connection and stop any future scheduled posts to this
              account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDisconnect}
              disabled={isDisconnecting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
