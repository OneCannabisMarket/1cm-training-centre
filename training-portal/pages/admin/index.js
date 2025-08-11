import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

export default function AdminHome() {
  return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Admin</h1>
        <div className="grid gap-3">
          <Link href="/admin/users" className="card">Manage Users</Link>
          <Link href="/admin/modules" className="card">Manage Modules</Link>
          <Link href="/admin/quizzes" className="card">Manage Quizzes</Link>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}