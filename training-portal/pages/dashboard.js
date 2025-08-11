import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import Link from 'next/link';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';

export default function DashboardPage() {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'modules'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setModules(list);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'progress'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.uid === user.uid) map[data.moduleId] = data;
      });
      setProgressMap(map);
    });
    return () => unsub();
  }, [user]);

  return (
    <ProtectedRoute>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Your Training</h1>
        <div className="grid gap-4">
          {modules.map((m) => {
            const prog = progressMap[m.id];
            return (
              <div key={m.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{m.title}</h2>
                    <p className="text-sm text-gray-600">{m.description || ''}</p>
                  </div>
                  <Link href={`/modules/${m.id}`} className="btn">Open</Link>
                </div>
                {prog && (
                  <div className="text-sm text-gray-600 mt-2">Completed quizzes: {prog.completedQuizIds?.length || 0} / {(m.quizIds?.length || 0)}</div>
                )}
              </div>
            );
          })}
          {modules.length === 0 && (
            <div className="text-gray-600">No modules assigned yet.</div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}