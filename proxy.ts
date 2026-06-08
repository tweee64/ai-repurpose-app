import NextAuth from 'next-auth';
import { authConfig } from '@/app/auth.config';

export const { auth: proxy } = NextAuth(authConfig);

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
};
