import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { arrayRemove, arrayUnion, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import RichText from '../../../components/RichText';

export default function AdminModuleEdit() {
  const router = useRouter();
  const { id } = router.query;
  const [moduleDoc, setModuleDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'modules', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setModuleDoc(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
      }
    });
    const unsubQ = onSnapshot(collection(db, 'quizzes'), (snap) => setQuizzes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsub(); unsubQ(); };
  }, [id]);

  async function save() {
    await updateDoc(doc(db, 'modules', id), { title, description });
  }

  async function toggleQuiz(qid) {
    if (!moduleDoc) return;
    const isAssigned = (moduleDoc.quizIds || []).includes(qid);
    await updateDoc(doc(db, 'modules', id), {
      quizIds: isAssigned ? arrayRemove(qid) : arrayUnion(qid),
    });
  }

  return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        {!moduleDoc ? (
          <div className="text-gray-600">Loading...</div>
        ) : (
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold">Edit Module</h1>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            <RichText value={description} onChange={setDescription} />
            <button className="btn w-max" onClick={save}>Save</button>

            <div className="card">
              <div className="font-semibold mb-2">Attach Quizzes</div>
              <div className="grid gap-2">
                {quizzes.map((q) => {
                  const isAssigned = (moduleDoc.quizIds || []).includes(q.id);
                  return (
                    <label key={q.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={isAssigned} onChange={() => toggleQuiz(q.id)} />
                      <span>{q.title}</span>
                    </label>
                  );
                })}
                {quizzes.length === 0 && (
                  <div className="text-gray-600">No quizzes available.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}