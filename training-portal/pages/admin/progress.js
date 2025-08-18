import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect, useMemo, useState } from 'react';

export default function AdminProgress() {
  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [progress, setProgress] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!db) return;
    const unsubM = onSnapshot(query(collection(db, 'modules'), orderBy('createdAt', 'desc')), (snap) => setModules(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubU = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubP = onSnapshot(collection(db, 'progress'), (snap) => setProgress(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubA = onSnapshot(collection(db, 'quizAttempts'), (snap) => setAttempts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubM(); unsubU(); unsubP(); unsubA(); };
  }, []);

  const moduleMap = useMemo(() => Object.fromEntries(modules.map((m) => [m.id, m])), [modules]);
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  const filteredProgress = useMemo(() => {
    const base = progress.filter((p) => (
      (!selectedModuleId || p.moduleId === selectedModuleId) &&
      (!selectedUserId || p.uid === selectedUserId)
    ));
    const term = search.trim().toLowerCase();
    if (!term) return base;
    return base.filter((p) => {
      const userText = (userMap[p.uid]?.displayName || userMap[p.uid]?.email || '').toLowerCase();
      const moduleText = (moduleMap[p.moduleId]?.title || '').toLowerCase();
      return userText.includes(term) || moduleText.includes(term);
    });
  }, [progress, selectedModuleId, selectedUserId, search, userMap, moduleMap]);

  const attemptsByUserQuiz = useMemo(() => Object.fromEntries(attempts.map((a) => [`${a.uid}_${a.quizId}`, a])), [attempts]);

  const totalPages = Math.max(1, Math.ceil(filteredProgress.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProgress.slice(start, start + pageSize);
  }, [filteredProgress, currentPage]);

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

  function formatSeconds(s) {
    if (s == null) return '-';
    const sec = Math.max(0, Math.round(s));
    const m = Math.floor(sec / 60);
    const r = sec % 60;
    return `${m}m ${r}s`;
  }

  return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Progress Dashboard</h1>
        <div className="card mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-1">
            <div className="text-sm mb-1">Filter by Module</div>
            <select className="input" value={selectedModuleId} onChange={(e) => { setSelectedModuleId(e.target.value); setPage(1); }}>
              <option value="">All modules</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
          <div className="sm:col-span-1">
            <div className="text-sm mb-1">Filter by User</div>
            <select className="input" value={selectedUserId} onChange={(e) => { setSelectedUserId(e.target.value); setPage(1); }}>
              <option value="">All users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName || u.email}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <div className="text-sm mb-1">Search</div>
            <input className="input" placeholder="Search user or module" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        <div className="grid gap-4">
          {paged.length === 0 && (
            <div className="text-gray-600">No progress yet.</div>
          )}

          {paged.map((p) => (
            <div key={p.id} className="card">
              <div className="font-semibold">{userMap[p.uid]?.displayName || userMap[p.uid]?.email || p.uid}</div>
              <div className="text-sm text-gray-600">Module: {moduleMap[p.moduleId]?.title || p.moduleId}</div>
              <div className="text-sm text-gray-600">Completed quizzes: {p.completedQuizIds?.length || 0} / {(moduleMap[p.moduleId]?.quizIds?.length || 0)}</div>
              <div className="text-sm text-gray-600">Module read time: {formatSeconds(p.contentDurationSeconds)}</div>
              {(moduleMap[p.moduleId]?.quizIds || []).map((qid) => {
                const a = attemptsByUserQuiz[`${p.uid}_${qid}`];
                return (
                  <div key={qid} className="text-xs text-gray-600 ml-4 mt-1">
                    Quiz: {qid} — attempts: {a?.attempts || 0}, best: {a?.bestPercent ?? 0}%{a?.bestPassSeconds != null ? `, best pass time: ${formatSeconds(a.bestPassSeconds)}` : ''}
                  </div>
                );
              })}
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

        <div className="flex items-center justify-between mt-4">
          <button className="btn" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <div className="text-sm text-gray-600">Page {currentPage} of {totalPages}</div>
          <button className="btn" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}