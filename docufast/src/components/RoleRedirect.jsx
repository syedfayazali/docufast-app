import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function RoleRedirect() {
  const { user } = useAuth();
  if (user?.role === "admin") return <Navigate to="/admin-dashboard" replace />;
  return <Navigate to="/home" replace />;
}