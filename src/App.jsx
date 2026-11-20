import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PatternLock from './components/PatternLock';
import QuickService from './components/QuickService';
import OrderHistory from './components/OrderHistory';
import StockManager from './components/StockManager';
import Contabilidad from './components/Contabilidad';
import ConfiguracionTaller from './components/ConfiguracionTaller';
import Login from './components/Login';
import { supabase } from './services/supabase';
import { obtenerConfiguracion, CONFIG_DEFAULT } from './services/configService';
import { guardarOrden } from './services/orderService';
import {
  obtenerRepuestos,
  obtenerSerialesDisponibles,
  marcarSerialUsado,
} from './services/stockService';
import { enviarWhatsApp, imprimirTicket80mm, generarComprobantePDF } from './utils/salidas';
import {
  Smartphone,
  Tablet,
  Monitor,
  Printer,
  Cpu,
  Save,
  FileText,
  Receipt,
  MessageCircle,
  PlusCircle,
  CheckCircle2,
  Wrench,
  PackageCheck,
  LogOut,
} from 'lucide-react';

const crearOrdenVacia = () => ({
  numero: null,
  fecha: new Date().toISOString().split('T')[0],
  cliente: '',
  documento: '',
  telefono: '',
  correo: '',
  tipoEquipo: 'Celular',
  tipoEquipoOtro: '',
  marca: '',
  modelo: '',
  imei: '',
  accesorios: '',
  estadoFisico: '',
  fallaDeclarada: '',
  observaciones: '',
  reparacion: '',
  estado: 'Recibido',
  tipoBloqueo: 'PATRON',
  codigoBloqueo: '',
  fechaEntrega: '',
  presupuesto: 0,
  recargoPorcentaje: 0,
  abono: 0,
  formaPago: 'Efectivo',
  repuestoNombre: '',
  repuestoSerial: '',
  repuestoPrecio: 0,
  manoObra: 0,
  mostrarRepuestoPdf: false,
});

export default function App() {
  const [sesion, setSesion] = useState(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSesion(session);
      setVerificandoSesion(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);
  const [activeTab, setActiveTab] = useState('nueva-orden');
  const [orden, setOrden] = useState(crearOrdenVacia());
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [listaRepuestos, setListaRepuestos] = useState([]);
  const [serialesDisponibles, setSerialesDisponibles] = useState([]);
  const [configTaller, setConfigTaller] = useState(CONFIG_DEFAULT);

  useEffect(() => {
    obtenerConfiguracion().then(setConfigTaller).catch(() => {});
  }, []);

  useEffect(() => {
    obtenerRepuestos().then(setListaRepuestos).catch(() => {});
  }, [activeTab]);

  const handleSeleccionarRepuesto = async (e) => {
    const id = Number(e.target.value);
    if (!id) {
      setSerialesDisponibles([]);
      setOrden((prev) => ({
        ...prev,
        repuestoNombre: '',
        repuestoSerial: '',
        repuestoPrecio: 0,
        presupuesto: Number(prev.manoObra) || 0,
      }));
      return;
    }
    const rep = listaRepuestos.find((r) => r.id === id);
    if (rep) {
      const precioRep = Number(rep.precio) || 0;
      const mano = Number(orden.manoObra) || 0;
      setOrden((prev) => ({
        ...prev,
        repuestoNombre: `${rep.nombre}${rep.modelo ? ' - ' + rep.modelo : ''}`,
        repuestoSerial: '',
        repuestoPrecio: precioRep,
        presupuesto: precioRep + mano,
      }));
      if (rep.usa_serial !== false) {
        const libres = await obtenerSerialesDisponibles(rep.id).catch(() => []);
        setSerialesDisponibles(libres);
      } else {
        setSerialesDisponibles([]);
      }
    }
  };

  const handleManoObraChange = (e) => {
    const mano = Number(e.target.value) || 0;
    const precioRep = Number(orden.repuestoPrecio) || 0;
    setOrden((prev) => ({
      ...prev,
      manoObra: mano,
      presupuesto: precioRep + mano,
    }));
  };

  const mostrarAviso = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 3500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOrden((prev) => ({ ...prev, [name]: value }));
  };

  const handleAplicarServicioRapido = (servicio) => {
    const fechaBase = new Date();
    fechaBase.setDate(fechaBase.getDate() + (Number(servicio.dias) || 0));
    const fechaCalculada = fechaBase.toISOString().split('T')[0];

    setOrden((prev) => ({
      ...prev,
      fallaDeclarada: servicio.falla,
      presupuesto: servicio.precio,
      fechaEntrega: fechaCalculada,
    }));
  };

  const handleGuardar = async () => {
    if (!orden.cliente.trim()) {
      mostrarAviso('Por favor escribe el nombre del cliente antes de guardar.', 'error');
      return;
    }

    try {
      setGuardando(true);
      const ordenGuardada = await guardarOrden(orden);
      if (ordenGuardada.repuestoSerial) {
        await marcarSerialUsado(ordenGuardada.repuestoSerial, ordenGuardada.numero);
      }
      setOrden(ordenGuardada);
      mostrarAviso(`¡Orden #${ordenGuardada.numero} guardada en la nube!`);
    } catch (error) {
      mostrarAviso('Error al guardar: ' + error.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleNuevaOrden = () => {
    setOrden(crearOrdenVacia());
    setSerialesDisponibles([]);
    setActiveTab('nueva-orden');
  };

  const handleEditarDesdeHistorial = (ordenSeleccionada) => {
    setOrden(ordenSeleccionada);
    setSerialesDisponibles([]);
    setActiveTab('nueva-orden');
  };

  // Cálculos financieros automáticos
  const presupuestoNum = Number(orden.presupuesto) || 0;
  const recargoPct = Number(orden.recargoPorcentaje) || 0;
  const abonoNum = Number(orden.abono) || 0;
  const montoRecargo = (presupuestoNum * recargoPct) / 100;
  const totalServicio = presupuestoNum + montoRecargo;
  const saldoPendiente = Math.max(0, totalServicio - abonoNum);

  const tiposEquipo = [
    { id: 'Celular', icon: Smartphone },
    { id: 'Tablet', icon: Tablet },
    { id: 'PC', icon: Monitor },
    { id: 'Impresora', icon: Printer },
    { id: 'Otros', icon: Cpu },
  ];

  const estadosOrden = [
    {
      id: 'Recibido',
      desc: 'Equipo recibido en mostrador',
      icon: CheckCircle2,
      activeClass: 'bg-emerald-500/15 border-emerald-500 text-emerald-400',
    },
    {
      id: 'En reparación',
      desc: 'En proceso técnico',
      icon: Wrench,
      activeClass: 'bg-cyan-500/15 border-cyan-500 text-cyan-400',
    },
    {
      id: 'Entregado',
      desc: 'Equipo entregado al cliente',
      icon: PackageCheck,
      activeClass: 'bg-amber-500/15 border-amber-500 text-amber-400',
    },
  ];

  if (verificandoSesion) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center text-slate-400 text-sm">
        Verificando acceso...
      </div>
    );
  }

  if (!sesion) { return <Login />;}

  const esTecnico = sesion?.user?.user_metadata?.rol === 'tecnico';

  return (
    <div className="flex min-h-screen bg-[#0b1120] text-slate-200">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} esTecnico={esTecnico} />

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Barra Superior */}
        <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-white">
              {activeTab === 'nueva-orden'
                ? orden.numero
                  ? `Editando Orden #${orden.numero}`
                  : 'Nueva Orden de Servicio'
                : activeTab === 'ordenes'
                ? 'Historial de Órdenes'
                : activeTab === 'stock'
                ? 'Stock / Repuestos'
                : activeTab === 'contabilidad'
                ? 'Contabilidad y Caja'
                : activeTab === 'config' || activeTab === 'configuracion'
                ? 'Configuración del Taller'
                : 'Módulo en construcción'}
            </h2>
            <p className="text-xs text-slate-400">Gestión rápida de recepción y diagnóstico</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'nueva-orden' && (
              <>
                <button
                  onClick={handleGuardar}
                  disabled={guardando}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => generarComprobantePDF(orden, configTaller)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-cyan-400" /> PDF
                </button>
                <button
                  onClick={() => imprimirTicket80mm(orden, configTaller)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-blue-400" /> Ticket 80mm
                </button>
                <button
                  onClick={() => enviarWhatsApp(orden, configTaller)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm font-medium border border-green-500/30 transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
              </>
            )}
            <button
              onClick={handleNuevaOrden}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-sm font-medium border border-violet-500/30 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Nueva
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              title="Cerrar sesión"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 text-sm font-medium border border-rose-500/30 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </header>

        {/* Aviso flotante (Toast) */}
        {mensaje && (
          <div
            className={`mx-6 mt-4 px-4 py-3 rounded-xl text-sm font-medium border ${
              mensaje.tipo === 'error'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Vistas */}
        {activeTab === 'nueva-orden' ? (
          <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-[1600px] w-full mx-auto">
            {/* Columna Izquierda */}
            <div className="xl:col-span-2 space-y-6">
              {/* Tarjeta 1: Datos del Cliente */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-4">

                  1. Datos del Cliente y Orden
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha de ingreso</label>
                    <input
                      type="date"
                      name="fecha"
                      value={orden.fecha}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Número de Documento</label>
                    <input
                      type="text"
                      name="documento"
                      placeholder="Cédula / NIT"
                      value={orden.documento}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nombre del Cliente *</label>
                    <input
                      type="text"
                      name="cliente"
                      placeholder="Ej. Carlos Pérez"
                      value={orden.cliente}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="tel"
                      name="telefono"
                      placeholder="Ej. 3101234567"
                      value={orden.telefono}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Dirección / Correo</label>
                    <input
                      type="text"
                      name="correo"
                      placeholder="Opcional"
                      value={orden.correo}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </section>

              {/* Tarjeta 2: Tipo de Equipo */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-4">
                  2. Información del Equipo
                </h3>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-5">
                  {tiposEquipo.map((tipo) => {
                    const Icon = tipo.icon;
                    const selected = orden.tipoEquipo === tipo.id;
                    return (
                      <button
                        key={tipo.id}
                        type="button"
                        onClick={() => setOrden((prev) => ({ ...prev, tipoEquipo: tipo.id }))}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition cursor-pointer ${
                          selected
                            ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-6 h-6 mb-1.5" />
                        <span className="text-xs font-medium">{tipo.id}</span>
                      </button>
                    );
                  })}
                </div>

                {orden.tipoEquipo === 'Otros' && (
                  <div className="mb-4">
                    <label className="block text-xs text-cyan-400 font-medium mb-1">
                      Tipo de equipo *
                    </label>
                    <input
                      type="text"
                      name="tipoEquipoOtro"
                      placeholder="Ej. Consola PS5, Televisor, Parlante, Reloj inteligente..."
                      value={orden.tipoEquipoOtro}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}



                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Marca</label>
                    <input
                      type="text"
                      name="marca"
                      placeholder="Ej. Samsung, Apple, HP..."
                      value={orden.marca}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Modelo</label>
                    <input
                      type="text"
                      name="modelo"
                      placeholder="Ej. Galaxy A54 / Pavilion 15"
                      value={orden.modelo}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">IMEI / Número de Serie</label>
                    <input
                      type="text"
                      name="imei"
                      placeholder="Serie o IMEI"
                      value={orden.imei}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Accesorios recibidos</label>
                    <input
                      type="text"
                      name="accesorios"
                      placeholder="Ej. Cargador, funda, SIM..."
                      value={orden.accesorios}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </section>

              {/* Tarjeta 3: Diagnóstico */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-4">
                  3. Diagnóstico y Reparación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Estado físico al recibir</label>
                    <textarea
                      rows="2"
                      name="estadoFisico"
                      placeholder="Rayones, golpes, tapa suelta..."
                      value={orden.estadoFisico}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Falla declarada por el cliente</label>
                    <textarea
                      rows="2"
                      name="fallaDeclarada"
                      placeholder="Ej. Pantalla rota, no carga..."
                      value={orden.fallaDeclarada}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Trabajo / Reparación realizada</label>
                    <textarea
                      rows="2"
                      name="reparacion"
                      placeholder="Detalle técnico del trabajo..."
                      value={orden.reparacion}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </section>

              {/* Tarjeta 4: Repuestos y Mano de Obra */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-4">
                  4. Repuestos del Inventario y Mano de Obra
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">
                      Seleccionar Repuesto (Opcional)
                    </label>
                    <select
                      onChange={handleSeleccionarRepuesto}
                      defaultValue=""
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">-- Ningún repuesto --</option>
                      {listaRepuestos.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre} {r.modelo ? `(${r.modelo})` : ''} — ${Number(r.precio).toLocaleString('es-CO')} (Stock: {r.stock})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selector del serial exacto (aparece si el repuesto tiene seriales) */}
                  {serialesDisponibles.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-xs text-violet-400 font-medium mb-1">
                        Serial exacto a instalar *
                      </label>
                      <select
                        value={orden.repuestoSerial}
                        onChange={(e) =>
                          setOrden((prev) => ({ ...prev, repuestoSerial: e.target.value }))
                        }
                        className="w-full bg-slate-950 border border-violet-500/40 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-violet-400"
                      >
                        <option value="">-- Elegir serial disponible --</option>
                        {serialesDisponibles.map((s) => (
                          <option key={s.id} value={s.serial}>
                            {s.serial} {s.fecha_vencimiento ? `(Vence: ${s.fecha_vencimiento})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Valor Repuesto ($)</label>
                    <input
                      type="number"
                      readOnly
                      value={orden.repuestoPrecio}
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Mano de Obra ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={orden.manoObra}
                      onChange={handleManoObraChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none mt-4">
                  <input
                    type="checkbox"
                    checked={orden.mostrarRepuestoPdf}
                    onChange={(e) =>
                      setOrden((prev) => ({ ...prev, mostrarRepuestoPdf: e.target.checked }))
                    }
                    className="rounded accent-cyan-500"
                  />
                  Mostrar detalle del repuesto y mano de obra en PDF / Ticket
                </label>
              </section>
            </div>

            {/* Columna Derecha */}
            <div className="space-y-6">
              <QuickService onAplicar={handleAplicarServicioRapido} />

              {/* Estado de la Orden */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-4">
                  Estado de la Orden
                </h3>
                <div className="space-y-2.5">
                  {estadosOrden.map((est) => {
                    const Icon = est.icon;
                    const active = orden.estado === est.id;
                    return (
                      <button
                        key={est.id}
                        type="button"
                        onClick={() => setOrden((prev) => ({ ...prev, estado: est.id }))}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                          active
                            ? est.activeClass
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="text-sm font-semibold">{est.id}</div>
                          <div className="text-xs opacity-75">{est.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Patrón / PIN (solo Celular o Tablet) */}
              {(orden.tipoEquipo === 'Celular' || orden.tipoEquipo === 'Tablet') && (
                <PatternLock
                  tipoBloqueo={orden.tipoBloqueo}
                  codigoBloqueo={orden.codigoBloqueo}
                  onUpdate={(tipo, codigo) =>
                    setOrden((prev) => ({
                      ...prev,
                      tipoBloqueo: tipo,
                      codigoBloqueo: codigo,
                    }))
                  }
                />
              )}

              {/* Cobros y Resumen Financiero */}
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Cobros y Resumen Financiero
                  </h3>
                  {totalServicio > 0 && saldoPendiente === 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      PAGADO TOTAL
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fecha estimada de entrega</label>
                    <input
                      type="date"
                      name="fechaEntrega"
                      value={orden.fechaEntrega}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Presupuesto ($)</label>
                      <input
                        type="number"
                        min="0"
                        name="presupuesto"
                        value={orden.presupuesto}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Recargo (%)</label>
                      <input
                        type="number"
                        min="0"
                        name="recargoPorcentaje"
                        value={orden.recargoPorcentaje}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Abono / Seña ($)</label>
                      <input
                        type="number"
                        min="0"
                        name="abono"
                        value={orden.abono}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Forma de pago</label>
                      <select
                        name="formaPago"
                        value={orden.formaPago}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option>Efectivo</option>
                        <option>Transferencia</option>
                        <option>Tarjeta</option>
                        <option>Nequi / Daviplata</option>
                      </select>
                    </div>
                  </div>

                  {totalServicio > 0 && saldoPendiente > 0 && (
                    <button
                      type="button"
                      onClick={() => setOrden((prev) => ({ ...prev, abono: totalServicio }))}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Marcar como Pagado Total ($ {totalServicio.toLocaleString('es-CO')})
                    </button>
                  )}

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Recargo ({recargoPct}%):</span>
                      <span>$ {montoRecargo.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-slate-800">
                      <span>Total del Servicio:</span>
                      <span className="text-cyan-400">$ {totalServicio.toLocaleString('es-CO')}</span>
                    </div>
                    <div
                      className={`flex justify-between font-semibold ${
                        saldoPendiente === 0 && totalServicio > 0
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      <span>{saldoPendiente === 0 && totalServicio > 0 ? 'Estado:' : 'Saldo Pendiente:'}</span>
                      <span>
                        {saldoPendiente === 0 && totalServicio > 0
                          ? 'PAGADO ($ 0)'
                          : `$ ${saldoPendiente.toLocaleString('es-CO')}`}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : activeTab === 'ordenes' ? (
          <OrderHistory onEditarOrden={handleEditarDesdeHistorial} />
        ) : activeTab === 'stock' ? (
          <StockManager />
        ) : activeTab === 'contabilidad' && !esTecnico ? (
            <Contabilidad configTaller={configTaller} />
        ) : (activeTab === 'config' || activeTab === 'configuracion') && !esTecnico ? (
            <ConfiguracionTaller onConfigActualizada={setConfigTaller} />
        ) : (
          <div className="p-10 text-center text-slate-400">
            <p className="text-lg font-medium text-white mb-1">Módulo "{activeTab}" listo para construir</p>
            <p className="text-sm">Lo activaremos en las siguientes fases.</p>
          </div>
        )}
      </main>
    </div>
  );
}