import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Search,
  Plus,
  Upload,
  Download,
  Pencil,
  Trash2,
  Package,
  X,
  Check,
  Barcode,
} from 'lucide-react';
import {
  obtenerRepuestos,
  guardarRepuesto,
  importarRepuestosMasivo,
  eliminarRepuesto,
  obtenerSerialesPorRepuesto,
  agregarSerialesMasivo,
  eliminarSerial,
} from '../services/stockService';

const FORM_VACIO = {
  id: null,
  nombre: '',
  modelo: '',
  categoria: 'Pantallas',
  precio: 0,
  stock: 0,
  usa_serial: true,
};

export default function StockManager() {
  const [repuestos, setRepuestos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [importando, setImportando] = useState(false);
  const fileInputRef = useRef(null);

  // Estados para la ventana (Modal) de Seriales
  const [repuestoModal, setRepuestoModal] = useState(null);
  const [seriales, setSeriales] = useState([]);
  const [cargandoSeriales, setCargandoSeriales] = useState(false);
  const [textoSeriales, setTextoSeriales] = useState('');
  const [fechaVencLote, setFechaVencLote] = useState('');
  const [guardandoSeriales, setGuardandoSeriales] = useState(false);

  const cargarStock = async () => {
    try {
      setCargando(true);
      const data = await obtenerRepuestos();
      setRepuestos(data);
    } catch (error) {
      alert('Error al cargar inventario: ' + error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarStock();
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;

    try {
      const guardado = await guardarRepuesto(form);
      if (form.id) {
        setRepuestos((prev) => prev.map((r) => (r.id === guardado.id ? guardado : r)));
      } else {
        setRepuestos((prev) => [guardado, ...prev]);
      }
      setForm(FORM_VACIO);
      setMostrarForm(false);
    } catch (error) {
      alert('Error al guardar repuesto: ' + error.message);
    }
  };

  const handleEliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}" y todos sus seriales del inventario?`)) return;
    try {
      await eliminarRepuesto(id);
      setRepuestos((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      alert('No se pudo eliminar: ' + error.message);
    }
  };

  // --- GESTIÓN DE SERIALES ---
  const abrirModalSeriales = async (repuesto) => {
    setRepuestoModal(repuesto);
    setTextoSeriales('');
    setFechaVencLote('');
    try {
      setCargandoSeriales(true);
      const lista = await obtenerSerialesPorRepuesto(repuesto.id);
      setSeriales(lista);
    } catch (error) {
      alert('Error al cargar seriales: ' + error.message);
    } finally {
      setCargandoSeriales(false);
    }
  };

  const handleAgregarSeriales = async (e) => {
    e.preventDefault();
    const lineas = textoSeriales
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s !== '');

    if (lineas.length === 0) return;

    try {
      setGuardandoSeriales(true);
      await agregarSerialesMasivo(repuestoModal.id, lineas, fechaVencLote);
      setTextoSeriales('');
      const listaActualizada = await obtenerSerialesPorRepuesto(repuestoModal.id);
      setSeriales(listaActualizada);
      cargarStock(); // Actualiza el contador de Stock en la tabla principal
    } catch (error) {
      alert('Error al agregar seriales (verifica que no haya seriales repetidos): ' + error.message);
    } finally {
      setGuardandoSeriales(false);
    }
  };

  const handleBorrarSerial = async (serialId) => {
    if (!confirm('¿Eliminar este serial?')) return;
    try {
      await eliminarSerial(serialId, repuestoModal.id);
      setSeriales((prev) => prev.filter((s) => s.id !== serialId));
      cargarStock();
    } catch (error) {
      alert('Error al eliminar serial: ' + error.message);
    }
  };

  // --- EXCEL ---
  const descargarPlantillaExcel = () => {
    const ejemplo = [
      { Nombre: 'Pantalla OLED', Modelo: 'Xiaomi Redmi 15', Categoria: 'Pantallas', Precio: 180000, Stock: 0 },
      { Nombre: 'Batería Original', Modelo: 'iPhone 13', Categoria: 'Baterías', Precio: 95000, Stock: 0 },
    ];
    const hoja = XLSX.utils.json_to_sheet(ejemplo);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Repuestos');
    XLSX.writeFile(libro, 'plantilla_repuestos.xlsx');
  };

  const handleSubirExcel = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    try {
      setImportando(true);
      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer);
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja);

      const listaLimpia = filas
        .map((f) => ({
          nombre: String(f.Nombre || f.nombre || f.PRODUCTO || '').trim(),
          modelo: String(f.Modelo || f.modelo || '').trim(),
          categoria: String(f.Categoria || f.categoria || 'General').trim(),
          precio: Number(f.Precio || f.precio || 0) || 0,
          stock: Number(f.Stock || f.stock || 0) || 0,
          usa_serial: true,
        }))
        .filter((item) => item.nombre !== '');

      if (listaLimpia.length === 0) {
        alert('No se encontraron filas válidas. Asegúrate de usar la columna "Nombre".');
        return;
      }

      await importarRepuestosMasivo(listaLimpia);
      alert(`¡Se importaron ${listaLimpia.length} referencias correctamente!`);
      cargarStock();
    } catch (error) {
      alert('Error al importar Excel: ' + error.message);
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  const filtrados = repuestos.filter((r) => {
    const q = busqueda.toLowerCase();
    return (
      r.nombre.toLowerCase().includes(q) ||
      (r.modelo || '').toLowerCase().includes(q) ||
      (r.categoria || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-[1600px] w-full mx-auto space-y-5">
      {/* Barra superior */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar referencia por nombre, modelo o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setForm(FORM_VACIO);
              setMostrarForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nueva Referencia
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importando}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-sm font-medium transition cursor-pointer"
          >
            <Upload className="w-4 h-4" /> {importando ? 'Importando...' : 'Importar Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleSubirExcel}
            className="hidden"
          />

          <button
            onClick={descargarPlantillaExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-medium transition cursor-pointer"
          >
            <Download className="w-4 h-4" /> Plantilla
          </button>
        </div>
      </div>

      {/* Formulario de referencia */}
      {mostrarForm && (
        <form
          onSubmit={handleGuardar}
          className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <Package className="w-4 h-4" /> {form.id ? 'Editar Referencia' : 'Nueva Referencia de Repuesto'}
            </h3>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
              <input
                type="text"
                required
                placeholder="Ej. Pantalla OLED"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Referencia / Modelo</label>
              <input
                type="text"
                placeholder="Ej. Xiaomi Redmi 15"
                value={form.modelo}
                onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Precio ($)</label>
              <input
                type="number"
                min="0"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {form.usa_serial ? 'Stock (Automático por seriales)' : 'Cantidad en Stock'}
              </label>
              <input
                type="number"
                min="0"
                disabled={form.usa_serial}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.usa_serial}
                onChange={(e) => setForm({ ...form, usa_serial: e.target.checked })}
                className="rounded accent-cyan-500"
              />
              Controlar unidades por Serial individual y Fecha de vencimiento
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium cursor-pointer"
              >
                <Check className="w-4 h-4" /> Guardar Referencia
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tabla principal de referencias */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Repuesto</th>
                <th className="px-4 py-3">Referencia / Modelo</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-center">Stock Disponible</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {cargando ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                    Cargando inventario...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                    No hay repuestos registrados. Crea una referencia o importa un Excel.
                  </td>
                </tr>
              ) : (
                filtrados.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-medium text-white">{r.nombre}</td>
                    <td className="px-4 py-3 text-slate-300">{r.modelo || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-cyan-400">
                      $ {Number(r.precio).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          r.stock <= 2
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {r.stock} und.
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {r.usa_serial !== false && (
                          <button
                            onClick={() => abrirModalSeriales(r)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30 text-xs font-medium cursor-pointer"
                          >
                            <Barcode className="w-3.5 h-3.5" /> Seriales
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setForm({ ...r, usa_serial: r.usa_serial !== false });
                            setMostrarForm(true);
                          }}
                          className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(r.id, r.nombre)}
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE SERIALES (CARGA MASIVA Y TRAZABILIDAD) */}
      {repuestoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-violet-400" />
                  Seriales: {repuestoModal.nombre} {repuestoModal.modelo ? `(${repuestoModal.modelo})` : ''}
                </h3>
                <p className="text-xs text-slate-400">
                  Pega o escanea tus seriales (uno por línea). El stock se actualiza solo.
                </p>
              </div>
              <button onClick={() => setRepuestoModal(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              {/* Formulario para agregar lote de seriales */}
              <form onSubmit={handleAgregarSeriales} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">
                      Lista de Seriales (pega 1 o 100, uno por línea)
                    </label>
                    <textarea
                      rows="3"
                      required
                      placeholder={'SN-RM15-001\nSN-RM15-002\nSN-RM15-003'}
                      value={textoSeriales}
                      onChange={(e) => setTextoSeriales(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="flex flex-col justify-between gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Fecha vencimiento (lote)</label>
                      <input
                        type="date"
                        value={fechaVencLote}
                        onChange={(e) => setFechaVencLote(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={guardandoSeriales}
                      className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      {guardandoSeriales ? 'Agregando...' : '+ Agregar Seriales'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Lista de seriales registrados */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5">Serial</th>
                      <th className="px-3 py-2.5">Vencimiento</th>
                      <th className="px-3 py-2.5">Estado</th>
                      <th className="px-3 py-2.5">Orden Asignada</th>
                      <th className="px-3 py-2.5 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {cargandoSeriales ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-center text-slate-400">Cargando seriales...</td>
                      </tr>
                    ) : seriales.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-center text-slate-400">
                          Aún no hay seriales cargados para esta referencia.
                        </td>
                      </tr>
                    ) : (
                      seriales.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-800/40">
                          <td className="px-3 py-2 font-mono text-white">{s.serial}</td>
                          <td className="px-3 py-2 text-slate-300">
                            {s.fecha_vencimiento ? (
                              <span className={new Date(s.fecha_vencimiento) < new Date() ? 'text-rose-400 font-bold' : ''}>
                                {s.fecha_vencimiento}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded-full font-medium border ${
                                s.estado === 'Disponible'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-slate-700/50 text-slate-400 border-slate-600'
                              }`}
                            >
                              {s.estado}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-cyan-400">
                            {s.orden_numero ? `Orden #${s.orden_numero}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {s.estado === 'Disponible' && (
                              <button
                                onClick={() => handleBorrarSerial(s.id)}
                                className="text-rose-400 hover:text-rose-300 cursor-pointer"
                                title="Eliminar serial"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
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
        </div>
      )}
    </div>
  );
}