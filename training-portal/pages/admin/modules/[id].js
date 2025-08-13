import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Layout from '../../../components/Layout';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { arrayRemove, arrayUnion, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import RichText from '../../../components/RichText';
import { ROLE } from '../../../lib/roles';

export default function AdminModuleEdit() {
  const router = useRouter();
  const { id } = router.query;
  const [moduleDoc, setModuleDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [users, setUsers] = useState([]);
  const [quizSearch, setQuizSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [embeds, setEmbeds] = useState([]);
  const [newEmbed, setNewEmbed] = useState({ title: '', url: '', height: 600 });

  useEffect(() => {
    if (!id || !db) return;
    const unsub = onSnapshot(doc(db, 'modules', id), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setModuleDoc(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setEmbeds(Array.isArray(data.embeds) ? data.embeds : []);
      }
    });
    const unsubQ = onSnapshot(query(collection(db, 'quizzes'), orderBy('createdAt', 'desc')), (snap) => setQuizzes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubU = onSnapshot(collection(db, 'users'), (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unsub(); unsubQ(); unsubU(); };
  }, [id]);

  async function save() {
    setSaving(true);
    await updateDoc(doc(db, 'modules', id), { title, description, embeds });
    setSaving(false);
  }

  async function toggleQuiz(qid) {
    if (!moduleDoc) return;
    const isAssigned = (moduleDoc.quizIds || []).includes(qid);
    await updateDoc(doc(db, 'modules', id), {
      quizIds: isAssigned ? arrayRemove(qid) : arrayUnion(qid),
    });
  }

  async function moveQuiz(qid, direction) {
    if (!moduleDoc) return;
    const current = Array.from(moduleDoc.quizIds || []);
    const idx = current.indexOf(qid);
    if (idx === -1) return;
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= current.length) return;
    const next = current.slice();
    const tmp = next[idx];
    next[idx] = next[swapWith];
    next[swapWith] = tmp;
    await updateDoc(doc(db, 'modules', id), { quizIds: next });
  }

  async function toggleRole(role) {
    if (!moduleDoc) return;
    const hasRole = (moduleDoc.assignedRoles || []).includes(role);
    await updateDoc(doc(db, 'modules', id), { assignedRoles: hasRole ? arrayRemove(role) : arrayUnion(role) });
  }

  async function toggleUser(userId) {
    if (!moduleDoc) return;
    const hasUser = (moduleDoc.assignedUserIds || []).includes(userId);
    await updateDoc(doc(db, 'modules', id), { assignedUserIds: hasUser ? arrayRemove(userId) : arrayUnion(userId) });
  }

  async function deleteModule() {
    if (!confirm('Delete this module? This cannot be undone.')) return;
    await deleteDoc(doc(db, 'modules', id));
    router.replace('/admin/modules');
  }

  function addEmbed() {
    const t = newEmbed.title.trim();
    const u = newEmbed.url.trim();
    const h = Number.isFinite(newEmbed.height) ? Math.max(200, Math.min(2000, newEmbed.height)) : 600;
    if (!t || !u) return;
    const next = [...embeds, { title: t, url: u, height: h }];
    setEmbeds(next);
    setNewEmbed({ title: '', url: '', height: 600 });
  }

  function removeEmbed(index) {
    const next = embeds.slice();
    next.splice(index, 1);
    setEmbeds(next);
  }

  const filteredQuizzes = useMemo(() => {
    const term = quizSearch.trim().toLowerCase();
    if (!term) return quizzes;
    return quizzes.filter((q) => (q.title || '').toLowerCase().includes(term));
  }, [quizzes, quizSearch]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => ((u.displayName || u.email || '').toLowerCase().includes(term)));
  }, [users, userSearch]);

  return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        {!moduleDoc ? (
          <div className="text-gray-600">Loading...</div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Edit Module</h1>
              <button className="btn bg-red-600 hover:bg-red-700" onClick={deleteModule}>Delete</button>
            </div>

            <div className="card">
              <div className="grid gap-3">
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                <RichText value={description} onChange={setDescription} />
                <button className="btn w-max" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>

            <div className="card">
              <div className="font-semibold mb-2">Embeds (external pages)</div>
              <div className="grid gap-2">
                {embeds.map((e, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{e.title}</div>
                      <div className="text-xs text-gray-600 break-all">{e.url}</div>
                      <div className="text-xs text-gray-600">Height: {e.height}px</div>
                    </div>
                    <button type="button" className="btn bg-red-600 hover:bg-red-700" onClick={() => removeEmbed(idx)}>Remove</button>
                  </div>
                ))}
                {embeds.length === 0 && <div className="text-sm text-gray-600">No embeds added.</div>}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <input className="input" placeholder="Title" value={newEmbed.title} onChange={(e) => setNewEmbed((prev) => ({ ...prev, title: e.target.value }))} />
                <input className="input sm:col-span-2" placeholder="https://" value={newEmbed.url} onChange={(e) => setNewEmbed((prev) => ({ ...prev, url: e.target.value }))} />
                <input className="input w-32" type="number" min={200} max={2000} value={newEmbed.height} onChange={(e) => setNewEmbed((prev) => ({ ...prev, height: parseInt(e.target.value || '600', 10) }))} />
                <button type="button" className="btn" onClick={addEmbed}>Add Embed</button>
              </div>
              <div className="text-xs text-gray-600 mt-2">Note: Some sites block embedding with X-Frame-Options. In that case, users will see a link instead.</div>
            </div>

            <div className="card">
              <div className="font-semibold mb-2">Attach Quizzes</div>
              <div className="grid gap-3">
                <input className="input" placeholder="Search quizzes" value={quizSearch} onChange={(e) => setQuizSearch(e.target.value)} />
                <div className="grid gap-2">
                  {filteredQuizzes.map((q) => {
                    const isAssigned = (moduleDoc.quizIds || []).includes(q.id);
                    return (
                      <div key={q.id} className="flex items-center justify-between">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={isAssigned} onChange={() => toggleQuiz(q.id)} />
                          <span>{q.title}</span>
                        </label>
                        {isAssigned && (
                          <div className="flex items-center gap-2">
                            <button type="button" className="text-sm" onClick={() => moveQuiz(q.id, 'up')}>↑</button>
                            <button type="button" className="text-sm" onClick={() => moveQuiz(q.id, 'down')}>↓</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredQuizzes.length === 0 && (
                    <div className="text-gray-600">No quizzes found.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="font-semibold mb-2">Assign by Role</div>
              <div className="flex flex-wrap gap-3">
                {[ROLE.ADMIN, ROLE.MANAGER, ROLE.STAFF].map((role) => {
                  const checked = (moduleDoc.assignedRoles || []).includes(role);
                  return (
                    <label key={role} className="flex items-center gap-2">
                      <input type="checkbox" checked={checked} onChange={() => toggleRole(role)} />
                      <span className="capitalize">{role}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="font-semibold mb-2">Assign to Users</div>
              <input className="input mb-3" placeholder="Search users" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
              <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-auto">
                {filteredUsers.map((u) => {
                  const checked = (moduleDoc.assignedUserIds || []).includes(u.id);
                  return (
                    <label key={u.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={checked} onChange={() => toggleUser(u.id)} />
                      <span>{u.displayName || u.email}</span>
                    </label>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="text-gray-600">No users found.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}