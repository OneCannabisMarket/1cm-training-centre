import Layout from '../components/Layout';
import Link from 'next/link';
import { useAuth } from '../lib/auth';

export default function Home() {
  const { user } = useAuth();
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Welcome to the Training Portal</h1>
        <div className="card">
          <p className="text-gray-700">Your modules and quizzes will appear in your dashboard.</p>
          <div className="mt-4 flex gap-3">
            {user ? (
              <Link href="/dashboard" className="btn">Go to Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn">Login</Link>
                <Link href="/register" className="btn bg-gray-600 hover:bg-gray-700">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}