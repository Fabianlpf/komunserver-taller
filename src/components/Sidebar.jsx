import { 
  Wrench, 
  Package, 
  ShoppingCart, 
  Calculator, 
  Settings,
  ClipboardList
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'nueva-orden', label: 'Orden de Servicio', icon: Wrench },
    { id: 'ordenes', label: 'Historial de Órdenes', icon: ClipboardList },
    { id: 'stock', label: 'Stock / Repuestos', icon: Package },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'contabilidad', label: 'Contabilidad', icon: Calculator },
    { id: 'config', label: 'Configuración', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen">
      {/* Logo / Nombre del taller */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-lg">
          ST
        </div>
        <div>
          <h1 className="font-bold text-white leading-tight">Servicio Técnico</h1>
          <p className="text-xs text-slate-400">Panel de Gestión</p>
        </div>
      </div>

      {/* Opciones de navegación */}
      <nav className="flex-1 p-3 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Pie del menú */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        Sistema Web v1.0
      </div>
    </aside>
  );
}