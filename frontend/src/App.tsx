import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './layouts/MainLayout';

// Pages to be created
import Login from './pages/Login';
import Register from './pages/Register';
import Produtos from './pages/Produtos';
import MeusPedidos from './pages/MeusPedidos';
import AdminDashboard from './pages/AdminDashboard';

const PrivateRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const userRole = user?.role || JSON.parse(localStorage.getItem('user') || '{}')?.role;
  
  if (!token) return <Navigate to="/login" replace />;
  if (requireAdmin && userRole !== 'ADMIN') return <Navigate to="/produtos" replace />;
  
  return children;
};

const AppRoutes = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/produtos" replace />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="meus-pedidos" element={<MeusPedidos />} />
          <Route path="admin" element={<PrivateRoute requireAdmin><AdminDashboard /></PrivateRoute>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
