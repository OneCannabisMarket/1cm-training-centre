import { useRouter } from 'next/router';
import { doc, getDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

export default function ModuleDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [moduleDoc, setModuleDoc] = useState(null);

  useEffect(() => {
    if (!id) return;
    const ref = doc(db, 'modules', id);
    const unsub = onSnapshot(ref, (snap) => setModuleDoc(snap.exists() ? { id: snap.id, ...snap.data() } : null));
    return () => unsub();
  }, [id]);

  return (
    <ProtectedRoute>
      <Layout>
        {!moduleDoc ? (
          <div className="text-gray-600">Loading module...</div>
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