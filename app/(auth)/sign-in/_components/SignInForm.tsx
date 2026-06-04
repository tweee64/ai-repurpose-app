'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      valid = false;
    }
    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm bg-white dark:bg-gray-900 shadow-md rounded-xl p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="font-semibold text-2xl text-gray-900 dark:text-white">AI Repurpose</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to your account</p>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={emailError ? 'email-error' : undefined}
            aria-invalid={!!emailError}
            disabled={loading}
          />
          {emailError && (
            <p id="email-error" className="text-xs text-red-600 dark:text-red-400">
              {emailError}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={passwordError ? 'password-error' : undefined}
            aria-invalid={!!passwordError}
            disabled={loading}
          />
          {passwordError && (
            <p id="password-error" className="text-xs text-red-600 dark:text-red-400">
              {passwordError}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full h-10" disabled={loading} aria-busy={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <p className="text-sm text-center text-gray-600 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <a href="/register" className="text-blue-600 hover:underline dark:text-blue-400">
          Register
        </a>
      </p>
    </div>
  );
}
