import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { isAdmin, isManager } from '../lib/roles';

export default function Layout({ children }) {
  const router = useRouter();
  const { user, profile } = useAuth();

  async function handleSignOut() {
    await signOut(auth);
    router.push('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-gray-200 bg-white">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="font-semibold">Training Portal</Link>
          <div className="flex items-center gap-3">
            {profile && isAdmin(profile.role) && (
              <Link href="/admin" className="text-sm text-gray-700 hover:text-gray-900">Admin</Link>
            )}
            {profile && isManager(profile.role) && (
              <Link href="/manager/progress" className="text-sm text-gray-700 hover:text-gray-900">Manager</Link>
            )}
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm text-gray-700 hover:text-gray-900">Dashboard</Link>
                <Link href="/start" className="text-sm text-gray-700 hover:text-gray-900">Start Work</Link>
                <button onClick={handleSignOut} className="btn text-sm">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-700 hover:text-gray-900">Login</Link>
                <Link href="/register" className="text-sm text-gray-700 hover:text-gray-900">Register</Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className="container flex-1 py-6">{children}</main>
    </div>
  );
}