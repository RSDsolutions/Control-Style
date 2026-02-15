import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Ordenes } from './pages/Ordenes';
import { Productos } from './pages/Productos';
import { Inventario } from './pages/Inventario';
import { Gastos } from './pages/Gastos';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { CentroAlertas } from './pages/CentroAlertas';
import { Disenos } from './pages/Disenos';
import { Perfil } from './pages/Perfil';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [session, setSession] = useState<any>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(true);

  const fetchUserData = useStore(state => state.fetchUserData);
  const fetchInitialData = useStore(state => state.fetchInitialData);
  const empresaNombre = useStore(state => state.empresa?.nombre_empresa);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id).then(() => {
          fetchInitialData(); // Load data after user/company is set
        });
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id).then(() => {
          fetchInitialData();
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData, fetchInitialData]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-100">Cargando...</div>;
  }

  if (!session) {
    return authView === 'login'
      ? <Login onRegisterClick={() => setAuthView('register')} />
      : <Register onLoginClick={() => setAuthView('login')} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'ordenes': return <Ordenes />;
      case 'productos': return <Productos />;
      case 'disenos': return <Disenos />;
      case 'inventario': return <Inventario />;
      case 'gastos': return <Gastos />;
      case 'alertas': return <CentroAlertas />;
      case 'perfil': return <Perfil />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8f6f6]">
      <Sidebar currentPage={currentPage} setPage={setCurrentPage} />
      <main className="flex-1 overflow-hidden h-full">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;