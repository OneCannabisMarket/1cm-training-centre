import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect, useState } from 'react';

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [answerIndex, setAnswerIndex] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setQuizzes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  async function createQuiz(e) {
    e.preventDefault();
    if (!title.trim() || !question.trim()) return;
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) return;
    await addDoc(collection(db, 'quizzes'), {
      title: title.trim(),
      questions: [
        {
          type: 'mcq',
          question: question.trim(),
          options: cleanOptions,
          answerIndex,
        },
      ],
      createdAt: serverTimestamp(),
    });
    setTitle('');
    setQuestion('');
    setOptions(['', '', '', '']);
    setAnswerIndex(0);
  }

  async function removeQuiz(id) {
    if (!confirm('Delete quiz?')) return;
    await deleteDoc(doc(db, 'quizzes', id));
  }

  return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Quizzes</h1>

        <form onSubmit={createQuiz} className="card mb-6 flex flex-col gap-3">
          <input className="input" placeholder="Quiz title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input" placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {options.map((opt, idx) => (
              <input key={idx} className="input" placeholder={`Option ${idx + 1}`} value={opt} onChange={(e) => setOptions((prev) => prev.map((p, i) => (i === idx ? e.target.value : p)))} />
            ))}
          </div>
          <label className="text-sm">Correct answer index
            <input type="number" min={0} max={options.length - 1} className="input mt-1" value={answerIndex} onChange={(e) => setAnswerIndex(parseInt(e.target.value || '0', 10))} />
          </label>
          <button className="btn self-start">Create Quiz</button>
        </form>

        <div className="grid gap-3">
          {quizzes.map((qz) => (
            <div key={qz.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{qz.title}</div>
                  <div className="text-sm text-gray-600">Questions: {qz.questions?.length || 0}</div>
                </div>
                <div className="flex gap-2">
                  <a href={`/admin/quizzes/${qz.id}`} className="btn">Edit</a>
                  <button className="btn bg-red-600 hover:bg-red-700" onClick={() => removeQuiz(qz.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}