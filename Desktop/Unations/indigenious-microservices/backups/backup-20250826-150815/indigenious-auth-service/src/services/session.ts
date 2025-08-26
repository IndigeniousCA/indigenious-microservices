import { getServerSession as getNextAuthSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getSession() {
  return await getNextAuthSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export { getNextAuthSession as getServerSession };