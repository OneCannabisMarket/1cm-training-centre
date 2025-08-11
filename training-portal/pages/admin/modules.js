import Layout from '../../components/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect, useState } from 'react';
import RichText from '../../components/RichText';

export default function AdminModules() {
  const [modules, setModules] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'modules'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setModules(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  async function createModule(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await addDoc(collection(db, 'modules'), {
      title: title.trim(),
      description,
      quizIds: [],
      createdAt: serverTimestamp(),
    });
    setTitle('');
    setDescription('');
  }

  async function removeModule(id) {
    if (!confirm('Delete module?')) return;
    await deleteDoc(doc(db, 'modules', id));
  }

  return (
    <ProtectedRoute allow={["admin"]}>
      <Layout>
        <h1 className="text-xl font-semibold mb-4">Modules</h1>

        <form onSubmit={createModule} className="card mb-6 flex flex-col gap-3">
          <input className="input" placeholder="Module title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <RichText value={description} onChange={setDescription} placeholder="Short description" />
          <button className="btn self-start">Create Module</button>
        </form>

        <div className="grid gap-3">
          {modules.map((m) => (
            <div key={m.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{m.title}</div>
                </div>
                <div className="flex gap-2">
                  <a href={`/admin/modules/${m.id}`} className="btn">Edit</a>
                  <button className="btn bg-red-600 hover:bg-red-700" onClick={() => removeModule(m.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}