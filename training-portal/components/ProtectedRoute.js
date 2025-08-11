import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { ROLE } from '../lib/roles';

export default function ProtectedRoute({ children, allow = ['any'], redirectTo = '/login' }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(redirectTo);
      return;
    }
    if (allow.includes('any')) return;
    if (!profile) return;
    const role = profile.role;
    const isAllowed = allow.includes(role);
    if (!isAllowed) {
      router.replace('/dashboard');
    }
  }, [user, profile, loading, allow, router, redirectTo]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return children;
}