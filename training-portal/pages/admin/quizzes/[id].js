import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function AdminQuizEdit() {
  const router = useRouter();
  const { id } = router.query;
  const [quiz, setQuiz] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'quizzes', id)).then((snap) => setQuiz(snap.exists() ? { id: snap.id, ...snap.data() } : null));
  }, [id]);

  function updateField(path, value) {
    setQuiz((prev) => {
      const next = { ...prev };
      const parts = path.split('.')
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] };
        cur = cur[k];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  }

  async function save() {
    setSaving(true);
    await updateDoc(doc(db, 'quizzes', id), { title: quiz.title, questions: quiz.questions });
    setSaving(false);
  }

  if (!quiz) return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        <div className="text-gray-600">Loading...</div>
      </Layout>
    </ProtectedRoute>
  );

  return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Edit Quiz</h1>
        <input className="input mb-4" value={quiz.title} onChange={(e) => updateField('title', e.target.value)} />
        {quiz.questions?.map((q, qi) => (
          <div key={qi} className="card mb-3">
            <input className="input mb-2" value={q.question} onChange={(e) => updateField(`questions.${qi}.question`, e.target.value)} />
            <div className="grid gap-2">
              {q.options.map((opt, oi) => (
                <input key={oi} className="input" value={opt} onChange={(e) => updateField(`questions.${qi}.options.${oi}`, e.target.value)} />
              ))}
            </div>
            <label className="text-sm mt-2 block">Answer index
              <input type="number" min={0} max={q.options.length - 1} className="input mt-1" value={q.answerIndex} onChange={(e) => updateField(`questions.${qi}.answerIndex`, parseInt(e.target.value || '0', 10))} />
            </label>
          </div>
        ))}
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      </Layout>
    </ProtectedRoute>
  );
}