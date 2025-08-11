import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect, useMemo, useState } from 'react';

export default function AdminProgress() {
  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [progress, setProgress] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    if (!db) return;
    const unsubM = onSnapshot(query(collection(db, 'modules'), orderBy('createdAt', 'desc')), (snap) => setModules(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubU = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubP = onSnapshot(collection(db, 'progress'), (snap) => setProgress(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubM(); unsubU(); unsubP(); };
  }, []);

  const filteredProgress = useMemo(() => progress.filter((p) => (
    (!selectedModuleId || p.moduleId === selectedModuleId) &&
    (!selectedUserId || p.uid === selectedUserId)
  )), [progress, selectedModuleId, selectedUserId]);

  const moduleMap = useMemo(() => Object.fromEntries(modules.map((m) => [m.id, m])), [modules]);
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const summary = useMemo(() => {
    const modId = selectedModuleId || null;
    const relModules = modId ? modules.filter((m) => m.id === modId) : modules;
    const result = relModules.map((m) => {
      const total = m.quizIds?.length || 0;
      const rows = progress.filter((p) => p.moduleId === m.id).map((p) => ({ uid: p.uid, completed: p.completedQuizIds?.length || 0 }));
      return { moduleId: m.id, title: m.title, totalQuizzes: total, rows };
    });
    return result;
  }, [modules, progress, selectedModuleId]);

  return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Progress Dashboard</h1>
        <div className="card mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-sm mb-1">Filter by Module</div>
            <select className="input" value={selectedModuleId} onChange={(e) => setSelectedModuleId(e.target.value)}>
              <option value="">All modules</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
          <div>
            <div className="text-sm mb-1">Filter by User</div>
            <select className="input" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="">All users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName || u.email}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-4">
          {filteredProgress.length === 0 && (
            <div className="text-gray-600">No progress yet.</div>
          )}

          {filteredProgress.map((p) => (
            <div key={p.id} className="card">
              <div className="font-semibold">{userMap[p.uid]?.displayName || userMap[p.uid]?.email || p.uid}</div>
              <div className="text-sm text-gray-600">Module: {moduleMap[p.moduleId]?.title || p.moduleId}</div>
              <div className="text-sm text-gray-600">Completed quizzes: {p.completedQuizIds?.length || 0} / {(moduleMap[p.moduleId]?.quizIds?.length || 0)}</div>
            </div>
          ))}

          <div className="card">
            <div className="font-semibold mb-2">Module Summary</div>
            <div className="grid gap-2">
              {summary.map((s) => (
                <div key={s.moduleId}>
                  <div>{s.title} — total quizzes: {s.totalQuizzes}</div>
                  <div className="text-sm text-gray-600">Learners with progress: {s.rows.length}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}