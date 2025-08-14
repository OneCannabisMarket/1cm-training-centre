import { useRouter } from 'next/router';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';

export default function ModuleDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [moduleDoc, setModuleDoc] = useState(null);
  const { user, profile } = useAuth();
  const [progress, setProgress] = useState(null);
  const [saving, setSaving] = useState(false);
  const startedAtMsRef = useRef(null);

  useEffect(() => {
    if (!id || !db) return;
    const ref = doc(db, 'modules', id);
    const unsub = onSnapshot(ref, (snap) => setModuleDoc(snap.exists() ? { id: snap.id, ...snap.data() } : null));
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id || !user || !db) return;
    const progressId = `${user.uid}_${id}`;
    const ref = doc(db, 'progress', progressId);
    const unsub = onSnapshot(ref, (snap) => setProgress(snap.exists() ? { id: snap.id, ...snap.data() } : null));
    return () => unsub();
  }, [id, user]);

  // Record a client start time when module is visible for a user
  useEffect(() => {
    if (!id || !user) return;
    if (!startedAtMsRef.current) startedAtMsRef.current = Date.now();
    async function ensureStart() {
      const progressId = `${user.uid}_${id}`;
      const ref = doc(db, 'progress', progressId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          moduleId: id,
          completedQuizIds: [],
          contentStartedAt: serverTimestamp(),
          contentStartedAtMs: startedAtMsRef.current,
          lastUpdatedAt: serverTimestamp(),
        }, { merge: true });
      } else if (!snap.data().contentStartedAt) {
        await setDoc(ref, {
          uid: user.uid,
          moduleId: id,
          contentStartedAt: serverTimestamp(),
          contentStartedAtMs: snap.data().contentStartedAtMs || startedAtMsRef.current,
          lastUpdatedAt: serverTimestamp(),
        }, { merge: true });
      }
    }
    ensureStart();
  }, [id, user]);

  const visible = useMemo(() => {
    if (!moduleDoc || !profile) return false;
    const byRole = (moduleDoc.assignedRoles || []).length === 0 || (moduleDoc.assignedRoles || []).includes(profile.role);
    const byUser = (moduleDoc.assignedUserIds || []).length === 0 || (moduleDoc.assignedUserIds || []).includes(user?.uid);
    return byRole && byUser;
  }, [moduleDoc, profile, user]);

  const contentCompleted = Boolean(progress?.contentCompletedAt);

  async function markContentComplete() {
    if (!user || !id) return;
    setSaving(true);
    const nowMs = Date.now();
    const startMs = progress?.contentStartedAtMs || startedAtMsRef.current || nowMs;
    const durationSeconds = Math.max(0, Math.round((nowMs - startMs) / 1000));
    const progressId = `${user.uid}_${id}`;
    const ref = doc(db, 'progress', progressId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        moduleId: id,
        completedQuizIds: [],
        contentStartedAt: serverTimestamp(),
        contentStartedAtMs: startMs,
        contentCompletedAt: serverTimestamp(),
        contentCompletedAtMs: nowMs,
        contentDurationSeconds: durationSeconds,
        lastUpdatedAt: serverTimestamp(),
      });
    } else if (!snap.data().contentCompletedAt) {
      await setDoc(ref, {
        contentCompletedAt: serverTimestamp(),
        contentCompletedAtMs: nowMs,
        contentDurationSeconds: durationSeconds,
        lastUpdatedAt: serverTimestamp(),
      }, { merge: true });
    }
    setSaving(false);
  }

  function canEmbed(url) {
    try { new URL(url); return true; } catch { return false; }
  }

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

            {(moduleDoc.embeds || []).length > 0 && (
              <div className="grid gap-4">
                {moduleDoc.embeds.map((e, idx) => (
                  <div key={idx} className="card">
                    <div className="font-medium mb-2">{e.title}</div>
                    {canEmbed(e.url) ? (
                      <iframe
                        src={e.url}
                        title={e.title}
                        className="w-full border rounded-md"
                        style={{ height: `${Math.max(200, Math.min(2000, e.height || 600))}px` }}
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      />
                    ) : (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Open link</a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="card">
              <div className="flex items-center justify-between">
                <div className="font-medium">Module completion</div>
                {contentCompleted ? (
                  <span className="text-green-700 text-sm">Completed</span>
                ) : (
                  <button className="btn" onClick={markContentComplete} disabled={saving}>{saving ? 'Saving…' : 'Mark as completed'}</button>
                )}
              </div>
              {!contentCompleted && (
                <div className="text-sm text-gray-600 mt-2">Complete the module to unlock quizzes.</div>
              )}
            </div>

            <div className="grid gap-2">
              {(moduleDoc.quizIds || []).map((qid) => (
                contentCompleted ? (
                  <Link key={qid} href={`/quizzes/${qid}?module=${moduleDoc.id}`} className="btn">Take Quiz</Link>
                ) : (
                  <button key={qid} className="btn opacity-60 cursor-not-allowed" disabled>Take Quiz</button>
                )
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