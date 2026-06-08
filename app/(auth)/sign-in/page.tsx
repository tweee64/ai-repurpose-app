import { Suspense } from 'react';
import { SignInForm } from './_components/SignInForm';

export const metadata = { title: 'Sign In' };

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
