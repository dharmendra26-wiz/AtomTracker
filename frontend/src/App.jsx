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
import UserManagement from "./UserManagement";

const ROLE_HOME = {
  Employee: "/employee",
  Manager:  "/manager",
  Admin:    "/admin",
};

function Protected({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role] || "/employee"} replace />;
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

      {/* Employee */}
      <Route path="/employee"             element={<Protected roles={["Employee"]}><EmployeeDashboard /></Protected>} />
      <Route path="/employee/goals"       element={<Protected roles={["Employee"]}><EmployeeDashboard /></Protected>} />
      <Route path="/employee/sheet/:id"   element={<Protected roles={["Employee"]}><SheetDetail /></Protected>} />
      <Route path="/employee/checkin/:id" element={<Protected roles={["Employee"]}><EmployeeCheckin /></Protected>} />
      <Route path="/employee/checkins"    element={<Protected roles={["Employee"]}><EmployeeDashboard /></Protected>} />

      {/* Manager */}
      <Route path="/manager"              element={<Protected roles={["Manager","Admin"]}><ManagerDashboard /></Protected>} />
      <Route path="/manager/team"         element={<Protected roles={["Manager","Admin"]}><ManagerDashboard /></Protected>} />
      <Route path="/manager/sheet/:id"    element={<Protected roles={["Manager","Admin"]}><ManagerSheetDetail /></Protected>} />
      <Route path="/manager/checkin/:id"  element={<Protected roles={["Manager","Admin"]}><ManagerCheckin /></Protected>} />
      <Route path="/manager/checkins"     element={<Protected roles={["Manager","Admin"]}><ManagerDashboard /></Protected>} />

      {/* Admin */}
      <Route path="/admin"                element={<Protected roles={["Admin"]}><AdminDashboard /></Protected>} />
      <Route path="/admin/analytics"      element={<Protected roles={["Admin"]}><AdminDashboard /></Protected>} />
      <Route path="/admin/audit"          element={<Protected roles={["Admin"]}><AdminDashboard /></Protected>} />
      <Route path="/admin/users"          element={<Protected roles={["Admin"]}><UserManagement /></Protected>} />

      <Route path="/"  element={<Home />} />
      <Route path="*"  element={<Home />} />
    </Routes>
  );
}
