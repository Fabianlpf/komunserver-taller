import { useState, useEffect } from 'react';
import { Zap, Plus, Pencil, Trash2, Check, X } from 'lucide-react';

const PLANTILLAS_INICIALES = [
  {
    id: 1,
    titulo: 'Cambio de módulo / pantalla',
    falla: 'Cliente declara pantalla rota, sin imagen, con manchas, líneas o falla de táctil.',
    dias: 2,
    precio: 120000,
  },
  {
    id: 2,
    titulo: 'Mantenimiento preventivo PC',
    falla: 'Equipo lento, sobrecalentamiento. Solicita limpieza interna, cambio de pasta térmica y optimización.',
    dias: 1,
    precio: 60000,
  },
  {
    id: 3,
    titulo: 'Cambio de pin de carga',
    falla: 'Equipo no carga o hace falso contacto al conectar el cargador.',
    dias: 1,
    precio: 45000,
  },
];

export default function QuickService({ onAplicar }) {
  // Carga las plantillas guardadas o usa las iniciales
  const [servicios, setServicios] = useState(() => {
    const guardados = localStorage.getItem('taller_servicios_rapidos');
    return guardados ? JSON.parse(guardados) : PLANTILLAS_INICIALES;
  });

  const [seleccionadoId, setSeleccionadoId] = useState(servicios[0]?.id || '');
  const [modoFormulario, setModoFormulario] = useState(null); // null | 'nuevo' | 'editar'
  const [form, setForm] = useState({ titulo: '', falla: '', dias: 1, precio: 0 });

  // Guarda automáticamente cualquier cambio en las plantillas
  useEffect(() => {
    localStorage.setItem('taller_servicios_rapidos', JSON.stringify(servicios));
  }, [servicios]);

  const servicioActual = servicios.find((s) => s.id === Number(seleccionadoId));

  const abrirNuevo = () => {
    setForm({ titulo: '', falla: '', dias: 1, precio: 0 });
    setModoFormulario('nuevo');
  };

  const abrirEditar = () => {
    if (!servicioActual) return;
    setForm({ ...servicioActual });
    setModoFormulario('editar');
  };

  const guardarPlantilla = (e) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;

    if (modoFormulario === 'nuevo') {
      const nuevo = {
        ...form,
        id: Date.now(),
        dias: Number(form.dias) || 1,
        precio: Number(form.precio) || 0,
      };
      setServicios([...servicios, nuevo]);
      setSeleccionadoId(nuevo.id);
    } else if (modoFormulario === 'editar') {
      setServicios(
        servicios.map((s) =>
          s.id === form.id
            ? { ...form, dias: Number(form.dias) || 1, precio: Number(form.precio) || 0 }
            : s
        )
      );
    }
    setModoFormulario(null);
  };

  const borrarPlantilla = () => {
    if (!servicioActual) return;
    const restantes = servicios.filter((s) => s.id !== servicioActual.id);
    setServicios(restantes);
    setSeleccionadoId(restantes[0]?.id || '');
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <Zap className="w-4 h-4" /> Servicio Rápido
        </h3>

        {!modoFormulario && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={abrirNuevo}
              title="Nueva plantilla"
              className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={abrirEditar}
              disabled={!servicioActual}
              title="Editar plantilla"
              className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 transition cursor-pointer disabled:opacity-40"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={borrarPlantilla}
              disabled={!servicioActual}
              title="Borrar plantilla"
              className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Vista normal: selector + botón Aplicar */}
      {!modoFormulario ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={seleccionadoId}
              onChange={(e) => setSeleccionadoId(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              {servicios.length === 0 && <option value="">Sin plantillas</option>}
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titulo}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!servicioActual}
              onClick={() => servicioActual && onAplicar(servicioActual)}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition cursor-pointer disabled:opacity-40"
            >
              Aplicar
            </button>
          </div>

          {servicioActual && (
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 space-y-1">
              <p className="text-slate-300">{servicioActual.falla}</p>
              <div className="flex justify-between pt-1 text-slate-500 font-medium">
                <span>Tiempo est.: {servicioActual.dias} día(s)</span>
                <span className="text-emerald-400">
                  Base: $ {servicioActual.precio.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Vista de creación / edición de plantilla */
        <form onSubmit={guardarPlantilla} className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <input
            type="text"
            placeholder="Nombre del servicio (ej. Cambio de batería)"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            required
          />
          <textarea
            rows="2"
            placeholder="Descripción de la falla..."
            value={form.falla}
            onChange={(e) => setForm({ ...form, falla: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Días estimados</label>
              <input
                type="number"
                min="0"
                value={form.dias}
                onChange={(e) => setForm({ ...form, dias: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Precio base ($)</label>
              <input
                type="number"
                min="0"
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setModoFormulario(null)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-500 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Guardar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}