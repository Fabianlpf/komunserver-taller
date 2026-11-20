import { useState, useEffect } from 'react';
import { Building2, Upload, Save, Trash2, CheckCircle2 } from 'lucide-react';
import {
  obtenerConfiguracion,
  guardarConfiguracion,
  CONFIG_DEFAULT,
} from '../services/configService';

export default function ConfiguracionTaller({ onConfigActualizada }) {
  const [config, setConfig] = useState(CONFIG_DEFAULT);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);

  useEffect(() => {
    obtenerConfiguracion()
      .then((data) => setConfig(data))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  // Convierte la imagen seleccionada a Base64 para guardarla en Supabase
  const handleSubirLogo = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    if (archivo.size > 500 * 1024) {
      alert('El logo es muy pesado. Usa una imagen menor a 500 KB (PNG o JPG).');
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      setConfig((prev) => ({ ...prev, logo_url: lector.result }));
    };
    lector.readAsDataURL(archivo);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      setGuardando(true);
      const actualizada = await guardarConfiguracion(config);
      setConfig(actualizada);
      if (onConfigActualizada) onConfigActualizada(actualizada);
      setGuardadoOk(true);
      setTimeout(() => setGuardadoOk(false), 3000);
    } catch (error) {
      alert('Error al guardar configuración: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="p-10 text-center text-slate-400">Cargando configuración del taller...</div>
    );
  }

  return (
    <div className="p-6 max-w-4xl w-full mx-auto space-y-6">
      <form
        onSubmit={handleGuardar}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Datos Corporativos del Taller</h3>
              <p className="text-xs text-slate-400">
                Esta información aparecerá en el PDF, Ticket 80mm y mensajes de WhatsApp
              </p>
            </div>
          </div>

          {guardadoOk && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" /> ¡Guardado!
            </span>
          )}
        </div>

        {/* Logo del taller */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
              {config.logo_url ? (
                <img
                  src={config.logo_url}
                  alt="Logo del taller"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Building2 className="w-7 h-7 text-slate-600" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-white">Logo del Taller</div>
              <div className="text-xs text-slate-400">PNG o JPG (máx. 500 KB)</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer">
              <Upload className="w-4 h-4 text-cyan-400" /> Subir Logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleSubirLogo}
                className="hidden"
              />
            </label>
            {config.logo_url && (
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, logo_url: '' }))}
                className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 cursor-pointer"
                title="Quitar logo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Campos de texto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre del Taller *</label>
            <input
              type="text"
              name="nombre"
              required
              value={config.nombre}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Subtítulo / Eslogan</label>
            <input
              type="text"
              name="subtitulo"
              value={config.subtitulo}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">NIT / RUT</label>
            <input
              type="text"
              name="nit"
              value={config.nit}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Teléfono / WhatsApp</label>
            <input
              type="text"
              name="telefono"
              value={config.telefono}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Ciudad / Dirección</label>
            <input
              type="text"
              name="ciudad"
              value={config.ciudad}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Sitio Web / Redes</label>
            <input
              type="text"
              name="web"
              value={config.web}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">
              Términos y Condiciones de Garantía (pie de página)
            </label>
            <textarea
              rows="3"
              name="terminos"
              value={config.terminos}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={guardando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}