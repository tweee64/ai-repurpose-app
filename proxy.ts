import NextAuth from 'next-auth';
import { authConfig } from '@/app/auth.config';

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ['/dashboard/:path*', '/settings/:path*'],
};
