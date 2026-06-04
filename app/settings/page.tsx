import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ConnectedAccountsSection } from './_components/ConnectedAccountsSection';
import { SettingsToastHandler } from './_components/SettingsToastHandler';

export const metadata: Metadata = {
  title: 'Settings',
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">Settings</h1>
        <ConnectedAccountsSection />
      </div>
      {/* Reads ?connected and ?error query params and fires toasts */}
      <Suspense>
        <SettingsToastHandler />
      </Suspense>
    </div>
  );
}
