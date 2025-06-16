import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase 配置
// 注意：在实际应用中，应该使用环境变量来保存这些敏感信息
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// 添加Firebase可用性标志和错误
// 默认假设Firebase可用，后续会验证
let isFirebaseAvailable = true;
let firebaseInitError = null;

// 初始化 Firebase 以及错误处理
let app, auth, db, googleProvider;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
} catch (error) {
  console.error("Firebase初始化失败:", error);
  firebaseInitError = error;
  isFirebaseAvailable = false;
  
  // 创建模拟对象，以防应用崩溃
  auth = {
    onAuthStateChanged: (callback) => {
      setTimeout(() => callback(null), 0);
      return () => {};
    },
    signOut: () => Promise.resolve()
  };
  
  db = {
    // 最小可用模拟对象
  };
  
  googleProvider = {};
}

/**
 * 检查Firebase服务是否可用
 * @returns {Promise<boolean>} Firebase服务是否可用
 */
export const checkFirebaseAvailability = async () => {
  // 如果初始化就失败了，直接返回false
  if (firebaseInitError) return false;
  
  try {
    // 尝试轻量级操作以验证连接
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('连接超时')), 5000)
    );
    
    await Promise.race([
      timeout,
      new Promise(resolve => {
        // 只是测试连接，不需要实际监听用户状态变化
        const unsubscribe = auth.onAuthStateChanged(() => {
          unsubscribe();
          resolve();
        }, (error) => {
          console.error("Firebase连接检测错误:", error);
          resolve(); // 即使有错误也resolve，让外层catch处理
        });
      })
    ]);
    
    return true;
  } catch (error) {
    console.warn("Firebase连接测试失败:", error);
    isFirebaseAvailable = false;
    return false;
  }
};

// 身份验证函数
export const registerWithEmailAndPassword = async (email, password, displayName) => {
  if (!isFirebaseAvailable) {
    return { user: null, error: new Error('Firebase服务不可用') };
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    await createUserDocument(userCredential.user.uid, { email, displayName: displayName || email });
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

export const loginWithEmailAndPassword = async (email, password) => {
  if (!isFirebaseAvailable) {
    return { user: null, error: new Error('Firebase服务不可用') };
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

export const loginWithGoogle = async () => {
  if (!isFirebaseAvailable) {
    return { user: null, error: new Error('Firebase服务不可用') };
  }
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // 确保用户文档存在
    await createUserDocument(result.user.uid, { 
      email: result.user.email, 
      displayName: result.user.displayName || result.user.email 
    });
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

export const sendPasswordReset = async (email) => {
  if (!isFirebaseAvailable) {
    return { error: new Error('Firebase服务不可用') };
  }
  
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const logout = async () => {
  if (!isFirebaseAvailable) {
    return { error: null };
  }
  
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    return { error };
  }
};

// 创建用户文档
export const createUserDocument = async (uid, userData) => {
  if (!isFirebaseAvailable) {
    return null;
  }
  
  try {
  const userRef = doc(db, "users", uid);
  const docSnap = await getDoc(userRef);
  
  if (!docSnap.exists()) {
    await setDoc(userRef, {
      ...userData,
      favorites: [],
      history: [],
      createdAt: new Date(),
    });
  }
  
  return userRef;
  } catch (error) {
    console.error("创建用户文档失败:", error);
    return null;
  }
};

// 验证用户是否登录
export const getCurrentUser = () => {
  if (!isFirebaseAvailable) {
    return Promise.resolve(null);
  }
  
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
};

export { auth, db, isFirebaseAvailable, firebaseInitError }; 