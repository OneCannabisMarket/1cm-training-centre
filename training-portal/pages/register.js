import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../lib/auth';

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  if (user) {
    if (typeof window !== 'undefined') router.replace('/dashboard');
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto card">
        <h1 className="text-xl font-semibold mb-4">Register</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input className="input" type="text" placeholder="Full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button className="btn" disabled={loading}>{loading ? 'Loading...' : 'Create account'}</button>
          <div className="text-sm text-gray-600">
            Already have an account? <Link href="/login" className="underline">Login</Link>
          </div>
        </form>
      </div>
    </Layout>
  );
}