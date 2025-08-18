import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ROLE } from './roles';

const AuthContext = createContext({ user: null, profile: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoadingAuth(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!user || !db) {
        setProfile(null);
        setLoadingProfile(false);
        return;
      }
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (!active) return;
      if (snap.exists()) {
        setProfile({ id: snap.id, ...snap.data() });
        setLoadingProfile(false);
      } else {
        const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        const defaultRole = adminEmails.includes((user.email || '').toLowerCase()) ? ROLE.ADMIN : ROLE.STAFF;

        const inviteRef = doc(collection(db, 'invites'), (user.email || ''));
        const inviteSnap = await getDoc(inviteRef);
        const role = inviteSnap.exists() && inviteSnap.data().role ? inviteSnap.data().role : defaultRole;
        const displayName = user.displayName || (inviteSnap.exists() ? inviteSnap.data().displayName || '' : '');
        const province = inviteSnap.exists() ? (inviteSnap.data().province || null) : null;

        await setDoc(ref, {
          uid: user.uid,
          email: user.email,
          displayName,
          role,
          province: province,
          createdAt: serverTimestamp(),
        }, { merge: true });
        if (inviteSnap.exists()) {
          await deleteDoc(inviteRef);
        }
        const finalSnap = await getDoc(ref);
        setProfile({ id: user.uid, ...finalSnap.data() });
        setLoadingProfile(false);
      }
    }
    setLoadingProfile(true);
    loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  const value = useMemo(() => ({ user, profile, loading: loadingAuth || loadingProfile }), [user, profile, loadingAuth, loadingProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}