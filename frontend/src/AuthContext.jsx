import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { api } from "./api";

const AuthCtx = createContext(null);

function loadFromStorage() {
  const token = sessionStorage.getItem("token");
  const name = sessionStorage.getItem("name");
  const role = sessionStorage.getItem("role");
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
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("name");
      sessionStorage.removeItem("role");
    }
  }, [user]);

  async function login(email, password) {
    const res = await api("/login", { method: "POST", body: { email, password }, auth: false });
    sessionStorage.setItem("token", res.token);
    sessionStorage.setItem("name", res.name);
    sessionStorage.setItem("role", res.role);
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
