import { useState, useEffect } from 'react';
import { Search, Eye, Trash2, RefreshCw, UserCheck } from 'lucide-react';
import { obtenerOrdenes, eliminarOrden } from '../services/orderService';

export default function OrderHistory({ onEditarOrden }) {
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [tipoBusqueda, setTipoBusqueda] = useState('todos'); // todos | documento | telefono | orden
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const lista = await obtenerOrdenes();
      setOrdenes(lista);
    } catch (error) {
      alert('Error al cargar órdenes: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleEliminar = async (numero) => {
    if (!confirm(`¿Seguro que deseas eliminar la Orden #${numero}?`)) return;
    try {
      await eliminarOrden(numero);
      setOrdenes((prev) => prev.filter((o) => o.numero !== numero));
    } catch (error) {
      alert('No se pudo eliminar: ' + error.message);
    }
  };

  // Filtrado según el criterio seleccionado
  const ordenesFiltradas = ordenes.filter((o) => {
    const texto = busqueda.trim().toLowerCase();
    const doc = (o.documento || '').toLowerCase();
    const tel = (o.telefono || '').toLowerCase();
    const num = String(o.numero || '');
    const cli = (o.cliente || '').toLowerCase();
    const mar = (o.marca || '').toLowerCase();
    const mod = (o.modelo || '').toLowerCase();
    const imei = (o.imei || '').toLowerCase();
    const otro = (o.tipoEquipoOtro || '').toLowerCase();

    let coincideTexto = true;
    if (texto !== '') {
      if (tipoBusqueda === 'documento') {
        coincideTexto = doc.includes(texto);
      } else if (tipoBusqueda === 'telefono') {
        coincideTexto = tel.includes(texto);
      } else if (tipoBusqueda === 'orden') {
        coincideTexto = num.includes(texto);
      } else {
        coincideTexto =
          num.includes(texto) ||
          doc.includes(texto) ||
          cli.includes(texto) ||
          tel.includes(texto) ||
          mar.includes(texto) ||
          mod.includes(texto) ||
          imei.includes(texto) ||
          otro.includes(texto);
      }
    }

    const coincideEstado = filtroEstado === 'Todos' || o.estado === filtroEstado;
    return coincideTexto && coincideEstado;
  });

  const placeholderBusqueda = {
    todos: 'Buscar por documento, teléfono, # orden, cliente, marca o IMEI...',
    documento: 'Escribe el número de documento (Cédula / NIT)...',
    telefono: 'Escribe el número de teléfono o WhatsApp...',
    orden: 'Escribe el número de orden (ej. 1, 2, 15)...',
  };

  const badgeEstado = (estado) => {
    if (estado === 'Recibido') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (estado === 'En reparación') return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  };

  return (
    <div className="p-6 max-w-[1600px] w-full mx-auto space-y-5">
      {/* Barra de consulta y filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Selector de tipo de consulta + buscador */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 min-w-[280px]">
            <select
              value={tipoBusqueda}
              onChange={(e) => setTipoBusqueda(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-cyan-400 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="todos">Todo</option>
              <option value="documento">Por Documento</option>
              <option value="telefono">Por Teléfono</option>
              <option value="orden">Por # Orden</option>
            </select>

            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={placeholderBusqueda[tipoBusqueda]}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Filtros de estado */}
          <div className="flex flex-wrap items-center gap-2">
            {['Todos', 'Recibido', 'En reparación', 'Entregado'].map((est) => (
              <button
                key={est}
                onClick={() => setFiltroEstado(est)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  filtroEstado === est
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {est}
              </button>
            ))}
            <button
              onClick={cargarDatos}
              title="Recargar"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Resumen cuando se está consultando un cliente o número */}
        {busqueda.trim() !== '' && (
          <div className="flex items-center gap-2 text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>
              Mostrando <b>{ordenesFiltradas.length}</b>{' '}
              {ordenesFiltradas.length === 1 ? 'orden encontrada' : 'órdenes encontradas'} para{' '}
              <b>"{busqueda.trim()}"</b>
            </span>
          </div>
        )}
      </div>

      {/* Tabla de órdenes */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3"># Orden</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente / Documento</th>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {cargando ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                    Cargando órdenes desde la nube...
                  </td>
                </tr>
              ) : ordenesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                    No se encontraron órdenes con ese criterio de búsqueda.
                  </td>
                </tr>
              ) : (
                ordenesFiltradas.map((o) => {
                  const total =
                    Number(o.presupuesto) +
                    (Number(o.presupuesto) * Number(o.recargoPorcentaje)) / 100;
                  const tipoMostrar =
                    o.tipoEquipo === 'Otros' && o.tipoEquipoOtro
                      ? o.tipoEquipoOtro
                      : o.tipoEquipo;

                  return (
                    <tr key={o.numero} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-cyan-400">#{o.numero}</td>
                      <td className="px-4 py-3 text-slate-400">{o.fecha}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{o.cliente}</div>
                        <div className="text-xs text-slate-400">
                          {o.documento ? `Doc: ${o.documento}` : 'Sin doc.'}
                          {o.telefono ? ` • Tel: ${o.telefono}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-200">
                          {tipoMostrar} {o.marca} {o.modelo}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[220px]">
                          {o.fallaDeclarada}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border ${badgeEstado(
                            o.estado
                          )}`}
                        >
                          {o.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        $ {total.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onEditarOrden(o)}
                            title="Abrir / Editar"
                            className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(o.numero)}
                            title="Eliminar"
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}