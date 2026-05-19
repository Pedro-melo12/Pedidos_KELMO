import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Package, ShieldCheck } from 'lucide-react';

export function MainLayout() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-gray-900 flex items-center">
              <Package className="mr-2" /> Sistema de Pedidos
            </Link>
            <nav className="hidden md:flex space-x-4">
              <Link to="/produtos" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md font-medium">Produtos</Link>
              <Link to="/meus-pedidos" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md font-medium">Meus Pedidos</Link>
              {isAdmin && (
                <Link to="/admin" className="text-primary-600 hover:text-primary-800 px-3 py-2 rounded-md font-medium flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1"/> Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Olá, {user?.nome}</span>
            <button onClick={logout} className="text-gray-500 hover:text-red-600 flex items-center text-sm font-medium">
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
