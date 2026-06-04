import { redirect } from 'next/navigation';
import { auth } from '@/app/auth';

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    redirect('/dashboard');
  }
  redirect('/sign-in');
}
