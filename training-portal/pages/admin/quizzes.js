import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect, useMemo, useState } from 'react';

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', options: ['', ''], answerIndex: 0 },
  ]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setQuizzes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPage(1);
    });
    return () => unsub();
  }, []);

  const filteredQuizzes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return quizzes;
    return quizzes.filter((qz) => (qz.title || '').toLowerCase().includes(term));
  }, [quizzes, search]);

  const totalPages = Math.max(1, Math.ceil(filteredQuizzes.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedQuizzes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuizzes.slice(start, start + pageSize);
  }, [filteredQuizzes, currentPage]);

  function updateQuestion(qi, field, value) {
    setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, [field]: value } : q)));
  }
  function updateOption(qi, oi, value) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qi) return q;
      const opts = q.options.slice();
      opts[oi] = value;
      return { ...q, options: opts };
    }));
  }
  function addQuestion() {
    setQuestions((prev) => [...prev, { question: '', options: ['', ''], answerIndex: 0 }]);
  }
  function removeQuestion(qi) {
    setQuestions((prev) => prev.filter((_, i) => i !== qi));
  }
  function addOption(qi) {
    setQuestions((prev) => prev.map((q, i) => i === qi ? { ...q, options: [...q.options, ''] } : q));
  }
  function removeOption(qi, oi) {
    setQuestions((prev) => prev.map((q, i) => {
      if (i !== qi) return q;
      const opts = q.options.filter((_, idx) => idx !== oi);
      const answerIndex = Math.min(q.answerIndex, Math.max(0, opts.length - 1));
      return { ...q, options: opts, answerIndex };
    }));
  }

  async function createQuiz(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const cleaned = questions
      .map((q) => ({
        type: 'mcq',
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()).filter(Boolean),
        answerIndex: q.answerIndex,
      }))
      .filter((q) => q.question && q.options.length >= 2 && q.answerIndex >= 0 && q.answerIndex < q.options.length);
    if (cleaned.length === 0) return;
    await addDoc(collection(db, 'quizzes'), {
      title: title.trim(),
      questions: cleaned,
      createdAt: serverTimestamp(),
    });
    setTitle('');
    setQuestions([{ question: '', options: ['', ''], answerIndex: 0 }]);
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

          {questions.map((q, qi) => (
            <div key={qi} className="border rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Question {qi + 1}</div>
                {questions.length > 1 && (
                  <button type="button" className="text-sm text-red-600" onClick={() => removeQuestion(qi)}>Remove</button>
                )}
              </div>
              <input className="input mb-2" placeholder="Question text" value={q.question} onChange={(e) => updateQuestion(qi, 'question', e.target.value)} />
              <div className="grid gap-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex gap-2 items-center">
                    <input className="input flex-1" placeholder={`Option ${oi + 1}`} value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} />
                    {q.options.length > 2 && (
                      <button type="button" className="text-sm text-red-600" onClick={() => removeOption(qi, oi)}>Remove</button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn w-max" onClick={() => addOption(qi)}>Add option</button>
              </div>
              <label className="text-sm mt-2 block">Correct answer index
                <input type="number" min={0} max={Math.max(0, q.options.length - 1)} className="input mt-1" value={q.answerIndex} onChange={(e) => updateQuestion(qi, 'answerIndex', parseInt(e.target.value || '0', 10))} />
              </label>
            </div>
          ))}
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={addQuestion}>Add question</button>
            <button className="btn" type="submit">Create Quiz</button>
          </div>
        </form>

        <div className="card mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-sm mb-1">Search</div>
            <input className="input" placeholder="Search quiz title" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600">{filteredQuizzes.length} results</div>
          </div>
        </div>

        <div className="grid gap-3">
          {pagedQuizzes.map((qz) => (
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

        <div className="flex items-center justify-between mt-4">
          <button className="btn" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <div className="text-sm text-gray-600">Page {currentPage} of {totalPages}</div>
          <button className="btn" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}