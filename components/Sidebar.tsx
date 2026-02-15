import React from 'react';
import { LayoutDashboard, ShoppingCart, Archive, Receipt, Tag, LogOut, Building2, Bell, Palette } from 'lucide-react';
import { useStore } from '../store/useStore';

interface SidebarProps {
  currentPage: string;
  setPage: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setPage }) => {
  const empresaNombre = useStore(state => state.empresa?.nombre_empresa);
  const logout = useStore(state => state.logout);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'ordenes', label: 'Órdenes', icon: <ShoppingCart size={20} /> },
    { id: 'disenos', label: 'Diseños', icon: <Palette size={20} /> },
    { id: 'productos', label: 'Productos', icon: <Tag size={20} /> },
    { id: 'inventario', label: 'Inventario', icon: <Archive size={20} /> },
    { id: 'gastos', label: 'Gastos Operativos', icon: <Receipt size={20} /> },
    { id: 'alertas', label: 'Centro de Alertas', icon: <Bell size={20} /> },
    { id: 'perfil', label: 'Perfil', icon: <Building2 size={20} /> },
  ];

  // LEAVE ALERTS LOGIC COMMENTED OUT FOR DEBUGGING
  // const alertas = useStore(state => state.obtenerAlertas());
  // const alertasCount = alertas.length;
  // const alertasCount = 0;

  const obtenerAlertas = useStore(state => state.obtenerAlertas);
  // Subscribe to changes? store updates trigger re-render anyway.
  // The issue was `obtenerAlertas()` returns a new array.
  // We can calculate this in a useEffect or useMemo if dependencies are stable.
  // But dependencies (store data) change.
  // Safest: Calculate inside useEffect.

  const [alertasCount, setAlertasCount] = React.useState(0);
  const { inventario, ordenes, gastos, productos, movimientos, pagos } = useStore();

  React.useEffect(() => {
    const alerts = obtenerAlertas();
    setAlertasCount(alerts.length);
  }, [inventario, ordenes, gastos, productos, movimientos, pagos, obtenerAlertas]);

  const handleLogout = () => {
    if (window.confirm("¿Estás seguro que deseas cerrar sesión?")) {
      logout();
    }
  };

  return (
    <aside className="w-64 bg-[#1a1a1a] text-white flex flex-col h-full shadow-xl">
      <div className="h-20 flex items-center px-6 border-b border-gray-800 bg-black/20">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center mr-3">
          <Building2 size={20} className="text-white" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="font-bold text-base truncate" title={empresaNombre || 'Gestion-Carsuit'}>
            {empresaNombre || 'Gestion-Carsuit'}
          </span>
          <span className="text-xs text-gray-400">Panel de Control</span>
        </div>
      </div>

      <nav className="flex-1 py-6 space-y-1 px-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group ${currentPage === item.id
              ? 'bg-primary text-white shadow-lg shadow-primary/30'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <span className={`${currentPage === item.id ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`}>
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
            </div>
            {item.id === 'alertas' && alertasCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {alertasCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <img
            src="https://picsum.photos/100/100"
            alt="User"
            className="w-10 h-10 rounded-full border border-gray-600"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Administrador</p>
            <p className="text-xs text-gray-400">{empresaNombre || 'Empresa'}</p>
          </div>
          <button onClick={handleLogout} title="Cerrar Sesión">
            <LogOut size={18} className="text-gray-500 hover:text-red-400 cursor-pointer transition-colors" />
          </button>
        </div>
      </div>
    </aside>
  );
};