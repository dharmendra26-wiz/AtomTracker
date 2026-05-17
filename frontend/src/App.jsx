import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext";
import LoginPage from "./LoginPage";
import EmployeeDashboard from "./EmployeeDashboard";
import SheetDetail from "./SheetDetail";
import EmployeeCheckin from "./EmployeeCheckin";
import ManagerDashboard from "./ManagerDashboard";
import ManagerSheetDetail from "./ManagerSheetDetail";
import ManagerCheckin from "./ManagerCheckin";
import AdminDashboard from "./AdminDashboard";

const ROLE_HOME = {
  Employee: "/employee",
  Manager: "/manager",
  Admin: "/admin",
};

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || "/employee"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/employee"              element={<Protected><EmployeeDashboard /></Protected>} />
      <Route path="/employee/sheet/:id"    element={<Protected><SheetDetail /></Protected>} />
      <Route path="/employee/checkin/:id"  element={<Protected><EmployeeCheckin /></Protected>} />

      <Route path="/manager"               element={<Protected><ManagerDashboard /></Protected>} />
      <Route path="/manager/sheet/:id"     element={<Protected><ManagerSheetDetail /></Protected>} />
      <Route path="/manager/checkin/:id"   element={<Protected><ManagerCheckin /></Protected>} />

      <Route path="/admin"                 element={<Protected><AdminDashboard /></Protected>} />

      <Route path="/" element={<Home />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
