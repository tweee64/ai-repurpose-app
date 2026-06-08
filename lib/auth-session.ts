import { cookies } from 'next/headers';
import { getToken } from 'next-auth/jwt';

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const token = await getToken({
    req: { headers: new Headers({ cookie: cookieHeader }) },
    secret: process.env.AUTH_SECRET ?? '',
  });

  return (token?.id as string) ?? null;
}
