import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect, useMemo, useState } from 'react';
import RichText from '../../components/RichText';
import { ROLE } from '../../lib/roles';

export default function AdminModules() {
  const [modules, setModules] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'modules'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setModules(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubU = onSnapshot(collection(db, 'users'), (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsub(); unsubU(); };
  }, []);

  async function createModule(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await addDoc(collection(db, 'modules'), {
      title: title.trim(),
      description,
      quizIds: [],
      assignedRoles: [],
      assignedUserIds: [],
      createdAt: serverTimestamp(),
    });
    setTitle('');
    setDescription('');
  }

  async function removeModule(id) {
    if (!confirm('Delete module?')) return;
    await deleteDoc(doc(db, 'modules', id));
  }

  async function toggleRole(moduleId, role) {
    const m = modules.find((x) => x.id === moduleId);
    const isAssigned = (m?.assignedRoles || []).includes(role);
    await updateDoc(doc(db, 'modules', moduleId), { assignedRoles: isAssigned ? arrayRemove(role) : arrayUnion(role) });
  }

  async function toggleUser(moduleId, userId) {
    const m = modules.find((x) => x.id === moduleId);
    const isAssigned = (m?.assignedUserIds || []).includes(userId);
    await updateDoc(doc(db, 'modules', moduleId), { assignedUserIds: isAssigned ? arrayRemove(userId) : arrayUnion(userId) });
  }

  return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Modules</h1>

        <form onSubmit={createModule} className="card mb-6 flex flex-col gap-3">
          <input className="input" placeholder="Module title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <RichText value={description} onChange={setDescription} placeholder="Short description" />
          <button className="btn self-start">Create Module</button>
        </form>

        <div className="grid gap-3">
          {modules.map((m) => (
            <div key={m.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{m.title}</div>
                </div>
                <div className="flex gap-2">
                  <a href={`/admin/modules/${m.id}`} className="btn">Edit</a>
                  <button className="btn bg-red-600 hover:bg-red-700" onClick={() => removeModule(m.id)}>Delete</button>
                </div>
              </div>

              <div className="mt-3">
                <div className="font-medium mb-1">Assign by Role</div>
                <div className="flex flex-wrap gap-3">
                  {[ROLE.ADMIN, ROLE.MANAGER, ROLE.STAFF].map((role) => {
                    const checked = (m.assignedRoles || []).includes(role);
                    return (
                      <label key={role} className="flex items-center gap-2">
                        <input type="checkbox" checked={checked} onChange={() => toggleRole(m.id, role)} />
                        <span className="capitalize">{role}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3">
                <div className="font-medium mb-1">Assign to Users</div>
                <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-auto">
                  {users.map((u) => {
                    const checked = (m.assignedUserIds || []).includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-2">
                        <input type="checkbox" checked={checked} onChange={() => toggleUser(m.id, u.id)} />
                        <span>{u.displayName || u.email}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}