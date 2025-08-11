import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';

export default function StartWorkPage() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState([]);

  useEffect(() => {
    if (!db) return;
    const uq = query(collection(db, 'modules'), orderBy('createdAt', 'desc'));
    const unsubM = onSnapshot(uq, (snap) => setModules(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    let unsubP = () => {};
    if (user) {
      unsubP = onSnapshot(collection(db, 'progress'), (snap) => {
        setProgress(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); 
      });
    }
    return () => { unsubM(); unsubP(); };
  }, [user]);

  const userProgressMap = useMemo(() => {
    const map = {};
    progress.forEach((p) => {
      if (p.uid === user?.uid) map[p.moduleId] = p;
    });
    return map;
  }, [progress, user]);

  const totalQuizzes = useMemo(() => modules.reduce((sum, m) => sum + ((m.quizIds?.length) || 0), 0), [modules]);
  const completedQuizzes = useMemo(() => modules.reduce((sum, m) => sum + ((userProgressMap[m.id]?.completedQuizIds?.length) || 0), 0), [modules, userProgressMap]);
  const allDone = totalQuizzes > 0 && completedQuizzes >= totalQuizzes;

  return (
    <ProtectedRoute>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Start Work</h1>
        <div className="card mb-4">
          <div>Total quizzes: {totalQuizzes}</div>
          <div>Completed: {completedQuizzes}</div>
        </div>
        <button className="btn" disabled={!allDone}>{allDone ? 'You can start work' : 'Complete all quizzes to start'}</button>
      </Layout>
    </ProtectedRoute>
  );
}