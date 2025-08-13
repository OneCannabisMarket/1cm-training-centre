import Layout from '../components/Layout';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Welcome to the Training Portal</h1>
        <div className="card">
          <p className="text-gray-700">Your modules and quizzes will appear in your dashboard.</p>
          <div className="mt-4 flex gap-3">
            {user ? (
              <Link href="/dashboard" className="btn bg-brand">Go to Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn bg-brand">Login</Link>
                <Link href="/register" className="btn bg-brand/80">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}