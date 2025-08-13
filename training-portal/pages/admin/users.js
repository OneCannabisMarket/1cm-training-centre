import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect, useMemo, useState } from 'react';
import { ROLE } from '../../lib/roles';
import { PROVINCES } from '../../lib/geo';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPage(1);
    });
    return () => unsub();
  }, []);

  const managers = useMemo(() => users.filter((u) => u.role === ROLE.MANAGER), [users]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => (
      (u.displayName || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term)
    ));
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  async function changeRole(userId, role) {
    await updateDoc(doc(db, 'users', userId), { role });
  }

  async function changeManager(userId, managerId) {
    await updateDoc(doc(db, 'users', userId), { managerId: managerId || null });
  }

  async function changeProvince(userId, province) {
    await updateDoc(doc(db, 'users', userId), { province: province || null });
  }

  return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Users</h1>

        <div className="card mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-sm mb-1">Search</div>
            <input className="input" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600">{filteredUsers.length} results</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Manager</th>
                <th className="py-2 pr-4">Province</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((u) => (
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
                  <td className="py-2 pr-4">
                    <select className="input" value={u.managerId || ''} onChange={(e) => changeManager(u.id, e.target.value)}>
                      <option value="">None</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <select className="input" value={u.province || ''} onChange={(e) => changeProvince(u.id, e.target.value)}>
                      <option value="">None</option>
                      {PROVINCES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button className="btn" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <div className="text-sm text-gray-600">Page {currentPage} of {totalPages}</div>
          <button className="btn" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}