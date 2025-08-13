import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import Link from 'next/link';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [modules, setModules] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    if (!db) return;
    const unsubM = onSnapshot(query(collection(db, 'modules'), orderBy('createdAt', 'desc')), (snap) => {
      setModules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubQ = onSnapshot(query(collection(db, 'quizzes'), orderBy('createdAt', 'desc')), (snap) => {
      setQuizzes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubM(); unsubQ(); };
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const unsub = onSnapshot(collection(db, 'progress'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.uid === user.uid) map[data.moduleId] = { id: d.id, ...data };
      });
      setProgressMap(map);
    });
    return () => unsub();
  }, [user]);

  const visibleModules = useMemo(() => {
    if (!profile) return [];
    const role = profile.role;
    return modules.filter((m) => {
      const byRole = (m.assignedRoles || []).length === 0 || (m.assignedRoles || []).includes(role);
      const byUser = (m.assignedUserIds || []).length === 0 || (m.assignedUserIds || []).includes(user?.uid);
      return byRole && byUser;
    });
  }, [modules, profile, user]);

  const quizMap = useMemo(() => Object.fromEntries(quizzes.map((q) => [q.id, q])), [quizzes]);

  function isModuleCompleted(mod) {
    const prog = progressMap[mod.id];
    const total = mod.quizIds?.length || 0;
    const completed = prog?.completedQuizIds?.length || 0;
    if (total > 0) return completed >= total;
    return Boolean(prog?.contentCompletedAt);
  }

  const sortedModules = useMemo(() => {
    const list = [...visibleModules];
    return list.sort((a, b) => {
      const aDone = isModuleCompleted(a);
      const bDone = isModuleCompleted(b);
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
    });
  }, [visibleModules, progressMap]);

  const completedModules = useMemo(() => sortedModules.filter(isModuleCompleted), [sortedModules, progressMap]);

  const completedQuizIds = useMemo(() => {
    const ids = new Set();
    Object.values(progressMap).forEach((p) => (p.completedQuizIds || []).forEach((id) => ids.add(id)));
    return Array.from(ids);
  }, [progressMap]);

  const completedQuizzes = useMemo(() => completedQuizIds.map((qid) => quizMap[qid]).filter(Boolean), [completedQuizIds, quizMap]);

  const totalQuizzes = useMemo(() => sortedModules.reduce((sum, m) => sum + ((m.quizIds?.length) || 0), 0), [sortedModules]);
  const completedCount = useMemo(() => Object.values(progressMap).reduce((sum, p) => sum + ((p.completedQuizIds?.length) || 0), 0), [progressMap]);
  const allDone = totalQuizzes > 0 && completedCount >= totalQuizzes;

  return (
    <ProtectedRoute>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Your Training</h1>

        <div className="card mb-4">
          <div>Total quizzes: {totalQuizzes}</div>
          <div>Completed: {completedCount}</div>
          <div className="text-sm text-gray-600">{allDone ? 'All training completed' : 'Complete all quizzes to finish your training'}</div>
        </div>

        <div className="grid gap-4">
          {sortedModules.map((m) => {
            const prog = progressMap[m.id];
            const total = m.quizIds?.length || 0;
            const completed = prog?.completedQuizIds?.length || 0;
            const done = isModuleCompleted(m);
            return (
              <div key={m.id} className={`card ${done ? 'opacity-90' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{m.title}</h2>
                    <p className="text-sm text-gray-600">{m.summary || ''}</p>
                    <div className="text-xs text-gray-600 mt-1">
                      {total > 0 ? (
                        <span>Completed quizzes: {completed} / {total}</span>
                      ) : (
                        <span>{progressMap[m.id]?.contentCompletedAt ? 'Content completed' : 'Content not completed'}</span>
                      )}
                    </div>
                  </div>
                  <Link href={`/modules/${m.id}`} className="btn bg-brand hover:opacity-90">Open</Link>
                </div>
              </div>
            );
          })}

          {sortedModules.length === 0 && (
            <div className="text-gray-600">No modules assigned.</div>
          )}
        </div>

        {completedModules.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Completed Modules</h2>
            <div className="grid gap-2">
              {completedModules.map((m) => (
                <div key={m.id} className="text-sm text-gray-800">{m.title}</div>
              ))}
            </div>
          </div>
        )}

        {completedQuizzes.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">Completed Quizzes</h2>
            <div className="grid gap-2">
              {completedQuizzes.map((q) => (
                <div key={q.id} className="text-sm text-gray-800">{q.title}</div>
              ))}
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}