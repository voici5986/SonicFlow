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
  getCurrentUser,
  isFirebaseAvailable,
  loginWithEmailAndPassword,
  loginWithGoogle,
  logout,
  registerWithEmailAndPassword,
  sendPasswordReset,
} from '../services/firebase';

describe('Firebase fallback', () => {
  it('stays unavailable when the public configuration is missing', async () => {
    expect(isFirebaseAvailable).toBe(false);
    expect(firebaseInitError).toBeInstanceOf(Error);
    await expect(checkFirebaseAvailability()).resolves.toBe(false);
  });

  it('short-circuits authentication operations while unavailable', async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    await expect(
      registerWithEmailAndPassword('user@example.com', 'password', 'User')
    ).resolves.toMatchObject({
      user: null,
      error: expect.any(Error),
    });
    await expect(loginWithEmailAndPassword('user@example.com', 'password')).resolves.toMatchObject({
      user: null,
      error: expect.any(Error),
    });
    await expect(loginWithGoogle()).resolves.toMatchObject({
      user: null,
      error: expect.any(Error),
    });
    await expect(sendPasswordReset('user@example.com')).resolves.toMatchObject({
      error: expect.any(Error),
    });
    await expect(logout()).resolves.toEqual({ error: null });
  });
});
