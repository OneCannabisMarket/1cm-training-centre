import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function AdminQuizEdit() {
  const router = useRouter();
  const { id } = router.query;
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [passingPercent, setPassingPercent] = useState(100);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!id || !db) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      const snap = await getDoc(doc(db, 'quizzes', id));
      if (cancelled) return;
      if (!snap.exists()) {
        setError('Quiz not found');
        setLoading(false);
        return;
      }
      const data = snap.data();
      setTitle(data.title || '');
      setPassingPercent(typeof data.passingPercent === 'number' ? data.passingPercent : 100);
      setQuestions(
        Array.isArray(data.questions)
          ? data.questions.map((q) => ({
              type: 'mcq',
              question: q.question || '',
              options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['', ''],
              answerIndex:
                typeof q.answerIndex === 'number' && q.answerIndex >= 0 && q.answerIndex < (q.options?.length || 0)
                  ? q.answerIndex
                  : 0,
            }))
          : []
      );
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function updateQuestionField(questionIndex, field, value) {
    setQuestions((prev) => prev.map((q, i) => (i === questionIndex ? { ...q, [field]: value } : q)));
  }

  function updateOption(questionIndex, optionIndex, value) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        const nextOptions = q.options.slice();
        nextOptions[optionIndex] = value;
        return { ...q, options: nextOptions };
      })
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, { type: 'mcq', question: '', options: ['', ''], answerIndex: 0 }]);
  }

  function removeQuestion(questionIndex) {
    setQuestions((prev) => prev.filter((_, i) => i !== questionIndex));
  }

  function addOption(questionIndex) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === questionIndex ? { ...q, options: [...q.options, ''] } : q))
    );
  }

  function removeOption(questionIndex, optionIndex) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        const opts = q.options.filter((_, idx) => idx !== optionIndex);
        const nextAnswerIndex = Math.min(q.answerIndex, Math.max(0, opts.length - 1));
        return { ...q, options: opts, answerIndex: nextAnswerIndex };
      })
    );
  }

  function validate() {
    if (!title.trim()) return 'Title is required';
    if (!Array.isArray(questions) || questions.length === 0) return 'At least one question is required';
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      if (!q.question || !q.question.trim()) return `Question ${i + 1} text is required`;
      const opts = (q.options || []).map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) return `Question ${i + 1} needs at least two options`;
      if (typeof q.answerIndex !== 'number' || q.answerIndex < 0 || q.answerIndex >= (q.options?.length || 0)) {
        return `Question ${i + 1} has an invalid answer index`;
      }
    }
    if (typeof passingPercent !== 'number' || passingPercent < 0 || passingPercent > 100) return 'Passing grade must be 0-100';
    return '';
  }

  async function save() {
    setError('');
    setSuccess('');
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    try {
      const cleaned = questions.map((q) => ({
        type: 'mcq',
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        answerIndex: q.answerIndex,
      }));
      await updateDoc(doc(db, 'quizzes', id), { title: title.trim(), questions: cleaned, passingPercent });
      setSuccess('Saved');
    } catch (e) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allow={["admin"]}>
        <Layout>
          <div className="text-gray-600">Loading...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Edit Quiz</h1>
        <div className="card mb-4">
          <label className="text-sm">Title</label>
          <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="text-sm mt-3">Passing grade (%)</label>
          <input className="input mt-1 w-32" type="number" min={0} max={100} value={passingPercent} onChange={(e) => setPassingPercent(parseInt(e.target.value || '0', 10))} />
        </div>

        {questions.map((q, qi) => (
          <div key={qi} className="card mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Question {qi + 1}</div>
              <div className="flex items-center gap-3">
                {questions.length > 1 && (
                  <button type="button" className="text-sm text-red-600" onClick={() => removeQuestion(qi)}>
                    Remove question
                  </button>
                )}
              </div>
            </div>

            <label className="text-sm">Question</label>
            <input
              className="input mt-1 mb-3"
              value={q.question}
              onChange={(e) => updateQuestionField(qi, 'question', e.target.value)}
              placeholder="Enter question text"
            />

            <div className="grid gap-2">
              <div className="font-medium">Options</div>
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    value={opt}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                  />
                  {q.options.length > 2 && (
                    <button type="button" className="text-sm text-red-600" onClick={() => removeOption(qi, oi)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn w-max" onClick={() => addOption(qi)}>
                Add option
              </button>
            </div>

            <label className="text-sm mt-3 block">Correct answer index</label>
            <input
              type="number"
              min={0}
              max={Math.max(0, (q.options?.length || 1) - 1)}
              className="input mt-1 w-32"
              value={q.answerIndex}
              onChange={(e) => updateQuestionField(qi, 'answerIndex', parseInt(e.target.value || '0', 10))}
            />
          </div>
        ))}

        <div className="flex items-center gap-2 mb-6">
          <button type="button" className="btn" onClick={addQuestion}>
            Add question
          </button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-700">{success}</div>}
      </Layout>
    </ProtectedRoute>
  );
}