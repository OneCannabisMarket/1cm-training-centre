import { useRouter } from 'next/router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';

export default function ModuleDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [moduleDoc, setModuleDoc] = useState(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!id || !db) return;
    const ref = doc(db, 'modules', id);
    const unsub = onSnapshot(ref, (snap) => setModuleDoc(snap.exists() ? { id: snap.id, ...snap.data() } : null));
    return () => unsub();
  }, [id]);

  const visible = useMemo(() => {
    if (!moduleDoc || !profile) return false;
    const byRole = (moduleDoc.assignedRoles || []).length === 0 || (moduleDoc.assignedRoles || []).includes(profile.role);
    const byUser = (moduleDoc.assignedUserIds || []).length === 0 || (moduleDoc.assignedUserIds || []).includes(user?.uid);
    return byRole && byUser;
  }, [moduleDoc, profile, user]);

  return (
    <ProtectedRoute>
      <Layout>
        {!moduleDoc ? (
          <div className="text-gray-600">Loading module...</div>
        ) : !visible ? (
          <div className="text-gray-600">You do not have access to this module.</div>
        ) : (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold">{moduleDoc.title}</h1>
            <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: moduleDoc.description || '' }} />
            <div className="grid gap-2">
              {(moduleDoc.quizIds || []).map((qid) => (
                <Link key={qid} href={`/quizzes/${qid}?module=${moduleDoc.id}`} className="btn">Take Quiz</Link>
              ))}
              {(moduleDoc.quizIds || []).length === 0 && (
                <div className="text-gray-600">No quizzes assigned.</div>
              )}
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}