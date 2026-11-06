import React, { createContext, useContext, useState, useEffect } from "react";
import { api, UserItem } from "@/lib/api";

interface AuthContextType {
  user: UserItem | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: UserItem, newToken?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("armarios_token"));
  const [user, setUser] = useState<UserItem | null>(() => {
    const saved = localStorage.getItem("armarios_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = () => {
    localStorage.removeItem("armarios_token");
    localStorage.removeItem("armarios_user");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem("armarios_token");
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await api.getMe();
        setUser(userData);
        localStorage.setItem("armarios_user", JSON.stringify(userData));
      } catch {
        // Token inválido ou expirado
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    localStorage.setItem("armarios_token", res.token);
    localStorage.setItem("armarios_user", JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const updateUser = (updatedUser: UserItem, newToken?: string) => {
    setUser(updatedUser);
    localStorage.setItem("armarios_user", JSON.stringify(updatedUser));
    if (newToken) {
      setToken(newToken);
      localStorage.setItem("armarios_token", newToken);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};

