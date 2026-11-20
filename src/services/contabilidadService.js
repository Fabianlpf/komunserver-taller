import { supabase } from './supabase';

export async function obtenerMovimientos() {
  const { data, error } = await supabase
    .from('movimientos_caja')
    .select('*')
    .order('fecha', { ascending: false })
    .order('id', { ascending: false });

  if (error) throw error;
  return data;
}

export async function guardarMovimiento(mov) {
  const datos = {
    fecha: mov.fecha || new Date().toISOString().split('T')[0],
    tipo: mov.tipo, // 'Ingreso' o 'Egreso'
    categoria: (mov.categoria || 'General').trim(),
    concepto: mov.concepto.trim(),
    monto: Number(mov.monto) || 0,
    forma_pago: mov.forma_pago || 'Efectivo',
  };

  const { data, error } = await supabase
    .from('movimientos_caja')
    .insert([datos])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function eliminarMovimiento(id) {
  const { error } = await supabase.from('movimientos_caja').delete().eq('id', id);
  if (error) throw error;
}