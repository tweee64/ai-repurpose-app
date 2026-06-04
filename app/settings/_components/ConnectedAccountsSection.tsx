'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ConnectedAccountCard } from './ConnectedAccountCard';
import { useConnectedAccounts } from './useConnectedAccounts';

export function ConnectedAccountsSection() {
  const { accounts, isLoading, error, disconnect, isDisconnecting } = useConnectedAccounts();

  const isTwitterConnected = accounts.some((a) => a.platform === 'twitter');
  const isLinkedInConnected = accounts.some((a) => a.platform === 'linkedin');

  return (
    <section aria-labelledby="connected-accounts-heading">
      <div className="mb-4">
        <h2
          id="connected-accounts-heading"
          className="text-lg font-medium text-gray-900 dark:text-white"
        >
          Connected Accounts
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your connected social media platforms.
        </p>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-[72px] w-full rounded-lg" />
            <Skeleton className="h-[72px] w-full rounded-lg" />
          </>
        ) : (
          accounts.map((account) => (
            <ConnectedAccountCard
              key={account.id}
              account={account}
              onDisconnect={disconnect}
              isDisconnecting={isDisconnecting}
            />
          ))
        )}

        {/* Connect CTAs — shown per platform when not yet connected */}
        {!isLoading && (!isTwitterConnected || !isLinkedInConnected) && (
          <div className="flex flex-wrap gap-3">
            {!isTwitterConnected && (
              <Button
                variant="default"
                size="sm"
                asChild
                className="shrink-0 bg-black hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100"
                aria-label="Connect X / Twitter account"
              >
                <a href="/api/auth/twitter">Connect X / Twitter</a>
              </Button>
            )}
            {!isLinkedInConnected && (
              <Button
                variant="default"
                size="sm"
                asChild
                className="shrink-0 bg-[#0077B5] hover:bg-[#006097]"
                aria-label="Connect LinkedIn account"
              >
                <a href="/api/auth/linkedin">Connect LinkedIn</a>
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
