import { supabase } from './supabase';

export async function obtenerRepuestos() {
  const { data, error } = await supabase
    .from('repuestos')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}

export async function guardarRepuesto(repuesto) {
  const datos = {
    nombre: repuesto.nombre.trim(),
    modelo: (repuesto.modelo || '').trim(),
    categoria: (repuesto.categoria || 'General').trim(),
    precio: Number(repuesto.precio) || 0,
    stock: Number(repuesto.stock) || 0,
    usa_serial: repuesto.usa_serial !== false,
  };

  if (repuesto.id) {
    const { data, error } = await supabase
      .from('repuestos')
      .update(datos)
      .eq('id', repuesto.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('repuestos')
      .insert([datos])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function importarRepuestosMasivo(lista) {
  const { data, error } = await supabase.from('repuestos').insert(lista).select();
  if (error) throw error;
  return data;
}

export async function eliminarRepuesto(id) {
  const { error } = await supabase.from('repuestos').delete().eq('id', id);
  if (error) throw error;
}

// --- FUNCIONES DE TRAZABILIDAD POR SERIAL ---

// Recuenta cuántos seriales siguen 'Disponible' y actualiza el stock automáticamente
export async function sincronizarStock(repuestoId) {
  const { count, error: countError } = await supabase
    .from('repuestos_seriales')
    .select('*', { count: 'exact', head: true })
    .eq('repuesto_id', repuestoId)
    .eq('estado', 'Disponible');

  if (countError) throw countError;

  const { error: updateError } = await supabase
    .from('repuestos')
    .update({ stock: count || 0 })
    .eq('id', repuestoId);

  if (updateError) throw updateError;
  return count || 0;
}

// Trae todos los seriales de una referencia (disponibles y usados)
export async function obtenerSerialesPorRepuesto(repuestoId) {
  const { data, error } = await supabase
    .from('repuestos_seriales')
    .select('*')
    .eq('repuesto_id', repuestoId)
    .order('estado', { ascending: true }) // 'Disponible' aparece primero
    .order('id', { ascending: false });

  if (error) throw error;
  return data;
}

// Trae solo los seriales disponibles (para el selector en la Orden de Servicio)
export async function obtenerSerialesDisponibles(repuestoId) {
  const { data, error } = await supabase
    .from('repuestos_seriales')
    .select('*')
    .eq('repuesto_id', repuestoId)
    .eq('estado', 'Disponible')
    .order('id', { ascending: true });

  if (error) throw error;
  return data;
}

// Carga masiva de seriales (pegando lista o escaneando)
export async function agregarSerialesMasivo(repuestoId, listaTextoSeriales, fechaVencimiento) {
  const filas = listaTextoSeriales.map((s) => ({
    repuesto_id: repuestoId,
    serial: s.trim(),
    fecha_vencimiento: fechaVencimiento || null,
    estado: 'Disponible',
  }));

  const { data, error } = await supabase.from('repuestos_seriales').insert(filas).select();
  if (error) throw error;

  await sincronizarStock(repuestoId);
  return data;
}

// Eliminar un serial puntual
export async function eliminarSerial(serialId, repuestoId) {
  const { error } = await supabase.from('repuestos_seriales').delete().eq('id', serialId);
  if (error) throw error;
  await sincronizarStock(repuestoId);
}

// Marca un serial como 'Usado' y lo vincula al # de orden del cliente
export async function marcarSerialUsado(serialTexto, ordenNumero) {
  if (!serialTexto) return;

  const { data, error } = await supabase
    .from('repuestos_seriales')
    .update({ estado: 'Usado', orden_numero: ordenNumero })
    .eq('serial', serialTexto)
    .eq('estado', 'Disponible')
    .select()
    .maybeSingle();

  if (error) throw error;
  if (data) {
    await sincronizarStock(data.repuesto_id);
  }
}