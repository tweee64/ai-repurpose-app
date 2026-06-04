import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const PROTECTED = ['/dashboard', '/settings'];
      const isProtected = PROTECTED.some(
        (p) => nextUrl.pathname === p || nextUrl.pathname.startsWith(p + '/'),
      );
      if (isProtected && !isLoggedIn) {
        const redirectUrl = new URL('/sign-in', nextUrl.origin);
        redirectUrl.searchParams.set('callbackUrl', nextUrl.pathname);
        return Response.redirect(redirectUrl);
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [],
  session: { strategy: 'jwt' },
};
