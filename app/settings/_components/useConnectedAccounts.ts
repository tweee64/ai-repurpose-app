'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ConnectedAccountSummary } from '@/types/connected-account';

interface UseConnectedAccountsState {
  accounts: ConnectedAccountSummary[];
  isLoading: boolean;
  error: string | null;
  disconnect: (accountId: string) => Promise<void>;
  isDisconnecting: boolean;
  refresh: () => void;
}

export function useConnectedAccounts(): UseConnectedAccountsState {
  const [accounts, setAccounts] = useState<ConnectedAccountSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchAccounts() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/settings/connected-accounts');
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? 'Failed to load connected accounts');
        }
        const data = (await res.json()) as { accounts: ConnectedAccountSummary[] };
        if (!cancelled) {
          setAccounts(data.accounts);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchAccounts();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const disconnect = useCallback(async (accountId: string) => {
    setIsDisconnecting(true);
    try {
      const res = await fetch(`/api/settings/connected-accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 404) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to disconnect account');
      }

      // Remove from local state immediately for snappy UX
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } finally {
      setIsDisconnecting(false);
    }
  }, []);

  return { accounts, isLoading, error, disconnect, isDisconnecting, refresh };
}
