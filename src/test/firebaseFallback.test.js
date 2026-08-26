import { describe, expect, it, vi } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => {
    throw new Error('firebase fixture initialization failure');
  }),
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getFirestore: vi.fn(),
  setDoc: vi.fn(),
}));
import {
  checkFirebaseAvailability,
  firebaseInitError,
  isFirebaseAvailable,
} from '../services/firebase';

describe('Firebase fallback', () => {
  it('stays unavailable when the public configuration is missing', async () => {
    expect(isFirebaseAvailable).toBe(false);
    expect(firebaseInitError).toBeInstanceOf(Error);
    await expect(checkFirebaseAvailability()).resolves.toBe(false);
  });
});
