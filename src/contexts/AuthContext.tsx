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

// Limpa qualquer sessão persistente (localStorage / cookies antigos) para garantir que
// o acesso seja sempre volátil por sessão e zerado ao fechar o navegador
function purgePersistentStorage() {
  try {
    localStorage.removeItem("armarios_token");
    localStorage.removeItem("armarios_user");
    if (typeof document !== "undefined" && document.cookie) {
      document.cookie.split(";").forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
        }
      });
    }
  } catch {
    // ignore
  }
}

// Limpeza preventiva de sessões persistentes anteriores
purgePersistentStorage();

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("armarios_token"));
  const [user, setUser] = useState<UserItem | null>(() => {
    try {
      const saved = sessionStorage.getItem("armarios_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const savedToken = sessionStorage.getItem("armarios_token");
    const savedUser = sessionStorage.getItem("armarios_user");
    // Hidrata instantaneamente se houver sessão temporária nesta aba e JWT estiver válido
    return !(savedUser && isTokenStructurallyValid(savedToken));
  });

  const logout = () => {
    purgePersistentStorage();
    sessionStorage.removeItem("armarios_token");
    sessionStorage.removeItem("armarios_user");
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
      const storedToken = sessionStorage.getItem("armarios_token");
      if (!storedToken) {
        api.warmup();
        setIsLoading(false);
        return;
      }

      try {
        const userData = await api.getMe();
        setUser(userData);
        sessionStorage.setItem("armarios_user", JSON.stringify(userData));
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
    purgePersistentStorage();
    const res = await api.login(email, pass);
    sessionStorage.setItem("armarios_token", res.token);
    sessionStorage.setItem("armarios_user", JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  };

  const updateUser = (updatedUser: UserItem, newToken?: string) => {
    setUser(updatedUser);
    sessionStorage.setItem("armarios_user", JSON.stringify(updatedUser));
    if (newToken) {
      setToken(newToken);
      sessionStorage.setItem("armarios_token", newToken);
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

