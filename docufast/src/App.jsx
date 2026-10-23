import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Public pages
import Home from '@/pages/Home';
import RoleRedirect from '@/components/RoleRedirect';
import Services from '@/pages/Services';
import ServiceDetail from '@/pages/ServiceDetail';
import About from '@/pages/About';
import Help from '@/pages/Help';
import Terms from '@/pages/legal/Terms';
import Privacy from '@/pages/legal/Privacy';
import Refund from '@/pages/legal/Refund';
import Contact from '@/pages/legal/Contact';
import DeleteAccount from '@/pages/legal/DeleteAccount';

// Customer pages
import Dashboard from '@/pages/Dashboard';
import Applications from '@/pages/Applications';
import ApplicationDetail from '@/pages/ApplicationDetail';
import Apply from '@/pages/Apply';
import ApplySuccess from '@/pages/ApplySuccess';
import Payments from '@/pages/Payments';
import Notifications from '@/pages/Notifications';
import Profile from '@/pages/Profile';
import Pay from '@/pages/Pay';
import Receipt from '@/pages/Receipt';
import BookAppointment from '@/pages/BookAppointment';
import MyAppointments from '@/pages/MyAppointments';
import AppointmentDetail from '@/pages/AppointmentDetail';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminApplications from '@/pages/admin/AdminApplications';
import ServiceEditor from '@/pages/admin/ServiceEditor';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminPayments from '@/pages/admin/AdminPayments';
import AdminAppointments from '@/pages/admin/AdminAppointments';
import AdminOrders from '@/pages/admin/AdminOrders';
import AdminOrderDetail from '@/pages/admin/AdminOrderDetail';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/home" element={<Home />} />
      <Route path="/services" element={<Services />} />
      <Route path="/services/:category" element={<Services />} />
      <Route path="/service/:id" element={<ServiceDetail />} />
      <Route path="/about" element={<About />} />
      <Route path="/help" element={<Help />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/refund-policy" element={<Refund />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/delete-account" element={<DeleteAccount />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Customer (protected) */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/apply/:serviceId" element={<Apply />} />
        <Route path="/apply/:serviceId/success" element={<ApplySuccess />} />
        <Route path="/pay" element={<Pay />} />
        <Route path="/receipt/:id" element={<Receipt />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/book-appointment" element={<BookAppointment />} />
        <Route path="/my-appointments" element={<MyAppointments />} />
        <Route path="/appointment/:id" element={<AppointmentDetail />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-applications" element={<AdminApplications />} />
          <Route path="/service-editor" element={<ServiceEditor />} />
          <Route path="/admin-users" element={<AdminUsers />} />
          <Route path="/admin-payments" element={<AdminPayments />} />
          <Route path="/admin-appointments" element={<AdminAppointments />} />
          <Route path="/admin-orders" element={<AdminOrders />} />
          <Route path="/admin-orders/:id" element={<AdminOrderDetail />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App