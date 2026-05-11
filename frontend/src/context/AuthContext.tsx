import React, { createContext, useContext, useEffect, useState } from 'react';

type User = {
  id?: string;
  userId?: string;
  name?: string;
  email: string;
  role?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  setUser: (u: User | null, token?: string | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined); 

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('ims_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('ims_token');
  });

  const setUser = (u: User | null, t: string | null = null) => {
    setUserState(u);
    setToken(t);
    if (u) {
      localStorage.setItem('ims_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('ims_user');
    }
    if (t) {
      localStorage.setItem('ims_token', t);
    } else {
      localStorage.removeItem('ims_token');
    }
  };

  useEffect(() => {
    // placeholder: token expiry checks could go here
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
