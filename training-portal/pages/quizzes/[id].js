import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { arrayUnion, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';

export default function QuizTake() {
  const router = useRouter();
  const { id } = router.query;
  const moduleId = router.query.module || null;
  const [quiz, setQuiz] = useState(null);
  const [selected, setSelected] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [percent, setPercent] = useState(0);
  const [passed, setPassed] = useState(false);
  const [contentCompleted, setContentCompleted] = useState(true);
  const attemptStartedAtMsRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'quizzes', id)).then((snap) => setQuiz(snap.exists() ? { id: snap.id, ...snap.data() } : null));
  }, [id]);

  useEffect(() => {
    attemptStartedAtMsRef.current = Date.now();
  }, [id]);

  useEffect(() => {
    async function checkModuleProgress() {
      if (!moduleId || !user) {
        setContentCompleted(true);
        return;
      }
      const progressId = `${user.uid}_${moduleId}`;
      const snap = await getDoc(doc(db, 'progress', progressId));
      setContentCompleted(snap.exists() && Boolean(snap.data().contentCompletedAt));
    }
    checkModuleProgress();
  }, [moduleId, user]);

  const numQuestions = quiz?.questions?.length || 0;
  const passingPercent = typeof quiz?.passingPercent === 'number' ? quiz.passingPercent : 100;

  function grade() {
    if (!quiz) return 0;
    let correct = 0;
    quiz.questions.forEach((q, idx) => {
      if (q.type === 'mcq' && selected[idx] === q.answerIndex) correct += 1;
    });
    return correct;
  }

  async function recordAttempt(passedNow, percentNow) {
    if (!user) return;
    const attemptRef = doc(db, 'quizAttempts', `${user.uid}_${id}`);
    const attemptSnap = await getDoc(attemptRef);

    const endMs = Date.now();
    const startMs = attemptStartedAtMsRef.current || endMs;
    const durationSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));

    if (!attemptSnap.exists()) {
      await setDoc(attemptRef, {
        uid: user.uid,
        quizId: id,
        attempts: 1,
        bestPercent: percentNow,
        lastAttemptAt: serverTimestamp(),
        lastAttemptStartedAtMs: startMs,
        lastAttemptCompletedAtMs: endMs,
        lastAttemptDurationSeconds: durationSeconds,
        bestPassSeconds: passedNow ? durationSeconds : null,
      });
    } else {
      const prev = attemptSnap.data();
      const nextBestPercent = Math.max(prev.bestPercent || 0, percentNow);
      const nextBestPassSeconds = passedNow
        ? Math.min(prev.bestPassSeconds || Infinity, durationSeconds)
        : prev.bestPassSeconds ?? null;
      await updateDoc(attemptRef, {
        attempts: increment(1),
        bestPercent: nextBestPercent,
        lastAttemptAt: serverTimestamp(),
        lastAttemptStartedAtMs: startMs,
        lastAttemptCompletedAtMs: endMs,
        lastAttemptDurationSeconds: durationSeconds,
        bestPassSeconds: nextBestPassSeconds,
      });
    }

    if (passedNow && moduleId) {
      const progressId = `${user.uid}_${moduleId}`;
      const ref = doc(db, 'progress', progressId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          moduleId,
          completedQuizIds: [id],
          contentCompletedAt: serverTimestamp(),
          lastUpdatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          completedQuizIds: arrayUnion(id),
          lastUpdatedAt: serverTimestamp(),
        });
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (moduleId && !contentCompleted) return; // enforce gate
    const correct = grade();
    const pct = numQuestions > 0 ? Math.round((correct / numQuestions) * 100) : 0;
    const passNow = pct >= passingPercent;
    setScore(correct);
    setPercent(pct);
    setPassed(passNow);
    setSubmitted(true);
    await recordAttempt(passNow, pct);
  }

  function resetAndRetry() {
    setSelected({});
    setSubmitted(false);
    setScore(0);
    setPercent(0);
    setPassed(false);
    attemptStartedAtMsRef.current = Date.now();
  }

  return (
    <ProtectedRoute>
      <Layout>
        {!quiz ? (
          <div className="text-gray-600">Loading quiz...</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold">{quiz.title}</h1>
            <div className="text-sm text-gray-600">Passing grade: {passingPercent}%</div>
            {moduleId && !contentCompleted && (
              <div className="text-sm text-red-600">Complete the module content before attempting this quiz.</div>
            )}
            {quiz.questions.map((q, idx) => (
              <div key={idx} className="card">
                <div className="font-medium">Q{idx + 1}. {q.question}</div>
                <div className="mt-2 grid gap-2">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className={`flex items-center gap-2 p-2 border rounded-md ${selected[idx] === oi ? 'border-blue-500' : 'border-gray-200'}`}>
                      <input type="radio" name={`q_${idx}`} checked={selected[idx] === oi} onChange={() => setSelected((prev) => ({ ...prev, [idx]: oi }))} disabled={moduleId && !contentCompleted} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn self-start" disabled={moduleId && !contentCompleted}>Submit</button>
            {submitted && (
              <div className="card">
                <div className="font-medium">Score: {score} / {numQuestions} ({percent}%) — {passed ? 'Passed' : 'Not passed'}</div>
                <div className="flex gap-2 mt-2">
                  {!passed && (
                    <button type="button" className="btn" onClick={resetAndRetry}>Retry</button>
                  )}
                  {passed && moduleId && (
                    <div className="text-sm text-gray-600">Completion recorded for this module.</div>
                  )}
                </div>
              </div>
            )}
          </form>
        )}
      </Layout>
    </ProtectedRoute>
  );
}