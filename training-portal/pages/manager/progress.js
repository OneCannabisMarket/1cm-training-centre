import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import { useEffect, useMemo, useState } from 'react';

export default function ManagerProgress() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [team, setTeam] = useState([]);
  const [progress, setProgress] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!db) return;
    const unsubM = onSnapshot(query(collection(db, 'modules'), orderBy('createdAt', 'desc')), (snap) => setModules(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    let unsubTeam = () => {};
    if (user) {
      unsubTeam = onSnapshot(query(collection(db, 'users'), where('managerId', '==', user.uid)), (snap) => setTeam(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    }
    const unsubP = onSnapshot(collection(db, 'progress'), (snap) => setProgress(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsubM(); unsubTeam(); unsubP(); };
  }, [user]);

  const teamIds = useMemo(() => new Set(team.map((t) => t.id)), [team]);
  const moduleMap = useMemo(() => Object.fromEntries(modules.map((m) => [m.id, m])), [modules]);
  const teamMap = useMemo(() => Object.fromEntries(team.map((t) => [t.id, t])), [team]);

  const filtered = useMemo(() => {
    const base = progress.filter((p) => teamIds.has(p.uid) && (!selectedModuleId || p.moduleId === selectedModuleId));
    const term = search.trim().toLowerCase();
    if (!term) return base;
    return base.filter((p) => {
      const userText = (teamMap[p.uid]?.displayName || teamMap[p.uid]?.email || '').toLowerCase();
      const moduleText = (moduleMap[p.moduleId]?.title || '').toLowerCase();
      return userText.includes(term) || moduleText.includes(term);
    });
  }, [progress, teamIds, selectedModuleId, search, teamMap, moduleMap]);

  return (
    <ProtectedRoute allow={["manager"]}>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Team Progress</h1>
        <div className="card mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-sm mb-1">Filter by Module</div>
            <select className="input" value={selectedModuleId} onChange={(e) => setSelectedModuleId(e.target.value)}>
              <option value="">All modules</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <div className="text-sm mb-1">Search</div>
            <input className="input" placeholder="Search user or module" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3">
          {filtered.map((p) => (
            <div key={p.id} className="card">
              <div className="font-semibold">{teamMap[p.uid]?.displayName || teamMap[p.uid]?.email || p.uid}</div>
              <div className="text-sm text-gray-600">Module: {moduleMap[p.moduleId]?.title || p.moduleId}</div>
              <div className="text-sm text-gray-600">Completed quizzes: {p.completedQuizIds?.length || 0} / {(moduleMap[p.moduleId]?.quizIds?.length || 0)}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-gray-600">No progress to show.</div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}