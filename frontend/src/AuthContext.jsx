import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { api } from "./api";

const AuthCtx = createContext(null);

function loadFromStorage() {
  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");
  const role = localStorage.getItem("role");
  if (!token) return null;
  try {
    const payload = jwtDecode(token);
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { token, name, role, id: payload.sub };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadFromStorage);

  useEffect(() => {
    if (!user) {
      localStorage.removeItem("token");
      localStorage.removeItem("name");
      localStorage.removeItem("role");
    }
  }, [user]);

  async function login(email, password) {
    const res = await api("/login", { method: "POST", body: { email, password }, auth: false });
    localStorage.setItem("token", res.token);
    localStorage.setItem("name", res.name);
    localStorage.setItem("role", res.role);
    setUser(loadFromStorage());
    return res;
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
