import { useState, useEffect } from 'react';
import { exportarContabilidadExcel, imprimirCierreCaja } from '../utils/reportesContabilidad';
import {
  FileSpreadsheet,
  Printer,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';
import {
  obtenerMovimientos,
  guardarMovimiento,
  eliminarMovimiento,
} from '../services/contabilidadService';
import { obtenerOrdenes } from '../services/orderService';

const FORM_VACIO = {
  fecha: new Date().toISOString().split('T')[0],
  tipo: 'Egreso',
  categoria: 'Gastos del Taller',
  concepto: '',
  monto: '',
  forma_pago: 'Efectivo',
};

export default function Contabilidad({ configTaller }) {
  const [movimientos, setMovimientos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState('mes'); // hoy | mes | todos
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const cargarTodo = async () => {
    try {
      setCargando(true);
      const [movs, ords] = await Promise.all([obtenerMovimientos(), obtenerOrdenes()]);
      setMovimientos(movs);
      setOrdenes(ords);
    } catch (error) {
      alert('Error al cargar contabilidad: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!form.concepto.trim() || !form.monto) return;

    try {
      setGuardando(true);
      const nuevo = await guardarMovimiento(form);
      setMovimientos((prev) => [nuevo, ...prev]);
      setForm(FORM_VACIO);
      setMostrarForm(false);
    } catch (error) {
      alert('Error al guardar movimiento: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id, concepto) => {
    if (!confirm(`¿Eliminar el movimiento "${concepto}"?`)) return;
    try {
      await eliminarMovimiento(id);
      setMovimientos((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      alert('No se pudo eliminar: ' + error.message);
    }
  };

  // Filtrado por período
  const hoyStr = new Date().toISOString().split('T')[0];
  const mesActualStr = hoyStr.slice(0, 7); // YYYY-MM

  const cumplePeriodo = (fecha) => {
    if (!fecha) return false;
    if (periodo === 'hoy') return fecha === hoyStr;
    if (periodo === 'mes') return fecha.startsWith(mesActualStr);
    return true;
  };

  // Convertimos los abonos de órdenes en movimientos de ingreso automáticos
  const ingresosOrdenes = ordenes
    .filter((o) => Number(o.abono) > 0 && cumplePeriodo(o.fecha))
    .map((o) => {
      const pres = Number(o.presupuesto) || 0;
      const rec = (pres * (Number(o.recargoPorcentaje) || 0)) / 100;
      const total = pres + rec;
      const abono = Number(o.abono) || 0;
      const saldo = Math.max(0, total - abono);
      const estaPagado = total > 0 && saldo === 0;

      return {
        id: `orden-${o.numero}`,
        esOrden: true,
        fecha: o.fecha,
        tipo: 'Ingreso',
        categoria: estaPagado ? 'Servicio Técnico • Pagado' : 'Servicio Técnico • Abono',
        concepto: estaPagado
          ? `Pago Total Orden #${o.numero} — ${o.cliente}`
          : `Abono Orden #${o.numero} — ${o.cliente} (Saldo: $${saldo.toLocaleString('es-CO')})`,
        monto: abono,
        forma_pago: o.formaPago || 'Efectivo',
      };
    });

  const movsFiltrados = movimientos
    .filter((m) => cumplePeriodo(m.fecha))
    .map((m) => ({ ...m, esOrden: false }));

  // Lista unificada y ordenada por fecha más reciente
  const historialUnificado = [...ingresosOrdenes, ...movsFiltrados].sort((a, b) =>
    b.fecha.localeCompare(a.fecha)
  );

  // Totales del período
  const totalIngresos = historialUnificado
    .filter((m) => m.tipo === 'Ingreso')
    .reduce((acc, m) => acc + Number(m.monto || 0), 0);

  const totalEgresos = historialUnificado
    .filter((m) => m.tipo === 'Egreso')
    .reduce((acc, m) => acc + Number(m.monto || 0), 0);

  const balanceCaja = totalIngresos - totalEgresos;

  // Saldo pendiente por cobrar (de órdenes en el período)
  const totalPorCobrar = ordenes
    .filter((o) => cumplePeriodo(o.fecha))
    .reduce((acc, o) => {
      const pres = Number(o.presupuesto) || 0;
      const rec = (pres * (Number(o.recargoPorcentaje) || 0)) / 100;
      const total = pres + rec;
      const saldo = Math.max(0, total - (Number(o.abono) || 0));
      return acc + saldo;
    }, 0);

  return (
    <div className="p-6 max-w-[1600px] w-full mx-auto space-y-6">
      {/* Barra superior: Filtros de período y botones */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {[
            { id: 'hoy', label: 'Hoy' },
            { id: 'mes', label: 'Este Mes' },
            { id: 'todos', label: 'Todo el Historial' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                periodo === p.id
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={cargarTodo}
            title="Actualizar datos"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              exportarContabilidadExcel(historialUnificado, {
                ingresos: totalIngresos,
                egresos: totalEgresos,
                balance: balanceCaja,
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-sm font-medium transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() =>
              imprimirCierreCaja(
                historialUnificado,
                {
                  ingresos: totalIngresos,
                  egresos: totalEgresos,
                  balance: balanceCaja,
                },
                configTaller
              )
            }
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-sm font-medium transition cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Imprimir Cierre
          </button>
          <button
            onClick={() => {
              setForm({ ...FORM_VACIO, tipo: 'Ingreso', categoria: 'Venta Directa' });
              setMostrarForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Registrar Ingreso
          </button>
          <button
            onClick={() => {
              setForm({ ...FORM_VACIO, tipo: 'Egreso', categoria: 'Gastos del Taller' });
              setMostrarForm(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-sm font-medium transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Registrar Gasto
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ingresos Totales</span>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-white">
            $ {totalIngresos.toLocaleString('es-CO')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Abonos de órdenes + ventas</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Egresos / Gastos</span>
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-white">
            $ {totalEgresos.toLocaleString('es-CO')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Compras, servicios y salidas</div>
        </div>

        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between text-cyan-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Balance en Caja</span>
            <Wallet className="w-5 h-5" />
          </div>
          <div
            className={`text-2xl font-bold ${
              balanceCaja >= 0 ? 'text-cyan-400' : 'text-rose-400'
            }`}
          >
            $ {balanceCaja.toLocaleString('es-CO')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Ingresos menos egresos</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Por Cobrar</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            $ {totalPorCobrar.toLocaleString('es-CO')}
          </div>
          <div className="text-xs text-slate-400 mt-1">Saldos pendientes en órdenes</div>
        </div>
      </div>

      {/* Formulario para nuevo Ingreso o Egreso */}
      {mostrarForm && (
        <form
          onSubmit={handleGuardar}
          className={`bg-slate-900 border rounded-2xl p-5 space-y-4 ${
            form.tipo === 'Ingreso' ? 'border-emerald-500/40' : 'border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3
              className={`text-sm font-bold ${
                form.tipo === 'Ingreso' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {form.tipo === 'Ingreso' ? 'Nuevo Ingreso Adicional' : 'Nuevo Egreso / Gasto'}
            </h3>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Concepto / Descripción *</label>
              <input
                type="text"
                required
                placeholder={
                  form.tipo === 'Ingreso'
                    ? 'Ej. Venta vidrio templado + funda'
                    : 'Ej. Compra de pantallas / Pago internet'
                }
                value={form.concepto}
                onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Monto ($) *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Forma de pago</label>
              <select
                value={form.forma_pago}
                onChange={(e) => setForm({ ...form, forma_pago: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Tarjeta</option>
                <option>Nequi / Daviplata</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer disabled:opacity-50 ${
                form.tipo === 'Ingreso'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <Check className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Guardar Movimiento'}
            </button>
          </div>
        </form>
      )}

      {/* Tabla de Movimientos */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {cargando ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                    Cargando movimientos...
                  </td>
                </tr>
              ) : historialUnificado.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-400">
                    No hay movimientos registrados en este período.
                  </td>
                </tr>
              ) : (
                historialUnificado.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 text-slate-400">{m.fecha}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                          m.tipo === 'Ingreso'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{m.concepto}</div>
                      <div className="text-xs text-slate-500">{m.categoria}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{m.forma_pago}</td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        m.tipo === 'Ingreso' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {m.tipo === 'Ingreso' ? '+' : '-'} $ {Number(m.monto).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.esOrden ? (
                        <span className="text-[11px] text-slate-500">Automático</span>
                      ) : (
                        <button
                          onClick={() => handleEliminar(m.id, m.concepto)}
                          title="Eliminar movimiento"
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}