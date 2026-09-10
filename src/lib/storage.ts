import { ModuleData, UserContextData } from '../types';
import { db, auth } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';

const getContextKey = () => {
  const uid = auth.currentUser?.uid;
  return uid ? `sabi_user_context_${uid}` : 'sabi_user_context_guest';
};

export const getUserContext = (): UserContextData => {
  const data = localStorage.getItem(getContextKey());
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
  }
  return { prota: '', prosem: '', cpAtp: '' };
};

export const fetchUserContextFromCloud = async (): Promise<UserContextData> => {
  if (auth.currentUser) {
    try {
      const res = await fetch(`/api/user-context?userId=${encodeURIComponent(auth.currentUser.uid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.prota || data.prosem || data.cpAtp || data.academicCalendar)) {
          localStorage.setItem(getContextKey(), JSON.stringify(data));
          return data;
        }
      }
    } catch (err) {
      console.warn('Could not fetch user context from InsForge, using local cache:', err);
    }
  }
  return getUserContext();
};

export const saveUserContext = async (context: UserContextData) => {
  localStorage.setItem(getContextKey(), JSON.stringify(context));
  if (auth.currentUser) {
    try {
      await fetch('/api/user-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          prota: context.prota,
          prosem: context.prosem,
          cpAtp: context.cpAtp,
          academicCalendar: context.academicCalendar
        })
      });
    } catch (err) {
      console.warn('Failed to sync user context to InsForge:', err);
    }
  }
};

// Map firestore timestamp to number
const mapDoc = (docSnap: any): ModuleData => {
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt,
    updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt
  } as ModuleData;
};

export const getHistory = async (): Promise<ModuleData[]> => {
  if (!auth.currentUser) return [];

  // 1. Try InsForge PostgreSQL API first
  try {
    const res = await fetch(`/api/modules?userId=${encodeURIComponent(auth.currentUser.uid)}`);
    if (res.ok) {
      const modules: ModuleData[] = await res.json();
      if (Array.isArray(modules)) {
        return modules;
      }
    }
  } catch (err) {
    console.warn('InsForge fetch failed, falling back to Firestore:', err);
  }

  // 2. Fallback to Firestore
  try {
    const q = query(
      collection(db, 'modules'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc);
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
};

export const saveToHistory = async (moduleData: ModuleData) => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const now = Date.now();
  const dataToSave = {
    ...moduleData,
    userId: uid,
    createdAt: moduleData.createdAt || now,
    updatedAt: now
  };

  // 1. Save to InsForge PostgreSQL API
  try {
    await fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSave)
    });
  } catch (err) {
    console.warn('Failed to save to InsForge:', err);
  }

  // 2. Also save to Firestore for redundancy
  try {
    await setDoc(doc(db, 'modules', moduleData.id), {
      ...moduleData,
      userId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.warn('Firestore backup write:', error);
  }
};

export const getModuleById = async (id: string): Promise<ModuleData | undefined> => {
  if (!auth.currentUser) return undefined;

  // 1. Try InsForge PostgreSQL API first
  try {
    const res = await fetch(`/api/modules/${encodeURIComponent(id)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.id) {
        return data as ModuleData;
      }
    }
  } catch (err) {
    console.warn('InsForge module fetch failed, falling back to Firestore:', err);
  }

  // 2. Fallback to Firestore
  try {
    const docRef = doc(db, 'modules', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return mapDoc(docSnap);
    }
  } catch (error) {
    console.error('Error fetching module by id:', error);
  }
  return undefined;
};

export const updateModule = async (id: string, updates: Partial<ModuleData>) => {
  if (!auth.currentUser) return;

  // 1. Update in InsForge PostgreSQL
  try {
    await fetch(`/api/modules/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  } catch (err) {
    console.warn('Failed to update in InsForge:', err);
  }

  // 2. Update in Firestore
  try {
    await updateDoc(doc(db, 'modules', id), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.warn('Firestore backup update:', error);
  }
};

export const deleteModule = async (id: string) => {
  if (!auth.currentUser) return;

  try {
    await fetch(`/api/modules/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('Failed to delete in InsForge:', err);
  }
};
