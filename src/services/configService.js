import { supabase } from './supabase';

export const CONFIG_DEFAULT = {
  id: 1,
  nombre: 'KOMUNSERVER',
  subtitulo: 'Soporte Informático y Servicio Técnico',
  nit: 'NIT: 80.921.167-4',
  ciudad: 'Pereira - Colombia',
  telefono: '3103043323',
  web: 'www.komunserver.vercel.app',
  terminos:
    'Pasados 30 días sin retirar el equipo, el taller no se hace responsable por almacenamiento. Garantía de 30 días únicamente sobre la reparación realizada.',
  logo_url: '',
};

export async function obtenerConfiguracion() {
  const { data, error } = await supabase
    .from('configuracion_taller')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  return data ? { ...CONFIG_DEFAULT, ...data } : CONFIG_DEFAULT;
}

export async function guardarConfiguracion(config) {
  const datos = {
    id: 1,
    nombre: (config.nombre || '').trim() || CONFIG_DEFAULT.nombre,
    subtitulo: (config.subtitulo || '').trim(),
    nit: (config.nit || '').trim(),
    ciudad: (config.ciudad || '').trim(),
    telefono: (config.telefono || '').trim(),
    web: (config.web || '').trim(),
    terminos: (config.terminos || '').trim(),
    logo_url: config.logo_url || '',
    actualizado_en: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('configuracion_taller')
    .upsert(datos, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}