import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect, useState } from 'react';
import { ROLE } from '../../lib/roles';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function changeRole(userId, role) {
    await updateDoc(doc(db, 'users', userId), { role });
  }

  return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Users</h1>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{u.displayName || '-'}</td>
                  <td className="py-2 pr-4">{u.email}</td>
                  <td className="py-2 pr-4">
                    <select className="input" value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                      <option value={ROLE.ADMIN}>Admin</option>
                      <option value={ROLE.MANAGER}>Manager</option>
                      <option value={ROLE.STAFF}>Staff</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}