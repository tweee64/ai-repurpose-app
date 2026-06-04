'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Reads ?connected=true and ?error=oauth_failed from the URL,
 * fires the appropriate toast, then strips the query params to
 * prevent re-firing on refresh.
 */
export function SettingsToastHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected) {
      toast.success('Account connected!');
    } else if (error === 'oauth_failed') {
      toast.error('Failed to connect account. Please try again.');
    } else {
      return; // nothing to do — skip router.replace
    }

    // Remove the query params so a refresh doesn't re-fire the toast
    router.replace(pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  return null;
}
