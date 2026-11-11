import React, { createContext, useContext, useState, useEffect } from "react";
import { api, UserItem } from "@/lib/api";

interface AuthContextType {
  user: UserItem | null;
  token: string | null;
  isAuthenticated: boolean;
  isGestor: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: UserItem, newToken?: string) => void;
}

function isTokenStructurallyValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload?.exp) return true;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("armarios_token"));
  const [user, setUser] = useState<UserItem | null>(() => {
    try {
      const saved = localStorage.getItem("armarios_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const savedToken = localStorage.getItem("armarios_token");
    const savedUser = localStorage.getItem("armarios_user");
    // Hidrata instantaneamente se houver sessão em cache com JWT ainda dentro da validade
    return !(savedUser && isTokenStructurallyValid(savedToken));
  });

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
        api.warmup();
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

  const isGestor = user?.role === "coordenador" || user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isGestor,
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

