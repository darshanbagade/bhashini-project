import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile 
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthContextProps {
  currentUser: User | null;
  userType: 'user' | 'agent' | null;
  loading: boolean;
  signup: (email: string, password: string, name: string, type: 'user' | 'agent') => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setTemporaryUserType: (type: 'user' | 'agent' | null) => void;
  checkUserType: () => Promise<'user' | 'agent' | null>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'user' | 'agent' | null>(null);
  const [temporaryUserType, setTemporaryUserType] = useState<'user' | 'agent' | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to check the actual user type from Firestore
  const checkUserType = async (): Promise<'user' | 'agent' | null> => {
    if (!currentUser) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        return userDoc.data().userType;
      }
      return null;
    } catch (error) {
      console.error('Error checking user type:', error);
      return null;
    }
  };

  async function signup(email: string, password: string, name: string, type: 'user' | 'agent') {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      await updateProfile(user, { displayName: name });
      
      // Save user type to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email,
        name,
        userType: type,
        createdAt: new Date().toISOString()
      });
      
      setUserType(type);
    } catch (error) {
      console.error("Error in signup:", error);
      throw error;
    }
  }

  async function login(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error in login:", error);
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setUserType(null);
      setTemporaryUserType(null);
    } catch (error) {
      console.error("Error in logout:", error);
      throw error;
    }
  }

  // Function to set a temporary user type
  const updateTemporaryUserType = (type: 'user' | 'agent' | null) => {
    setTemporaryUserType(type);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Get user type from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserType(userDoc.data().userType);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        // Clear temporary user type on logout
        setTemporaryUserType(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Determine which user type to use - temporary takes precedence
  const effectiveUserType = temporaryUserType || userType;

  const value = {
    currentUser,
    userType: effectiveUserType,
    loading,
    signup,
    login,
    logout,
    setTemporaryUserType: updateTemporaryUserType,
    checkUserType
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 