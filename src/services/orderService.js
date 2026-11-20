import { supabase } from './supabase';

// Convierte el formato de la pantalla al formato exacto de la base de datos
const mapearHaciaBD = (orden) => ({
  fecha: orden.fecha || new Date().toISOString().split('T')[0],
  cliente: orden.cliente.trim(),
  documento: (orden.documento || '').trim(),
  tipo_equipo_otro: orden.tipoEquipo === 'Otros' ? (orden.tipoEquipoOtro || '').trim() : '',
  telefono: orden.telefono.trim(),
  correo: orden.correo.trim(),
  tipo_equipo: orden.tipoEquipo,
  marca: orden.marca.trim(),
  modelo: orden.modelo.trim(),
  imei: orden.imei.trim(),
  accesorios: orden.accesorios.trim(),
  estado_fisico: orden.estadoFisico.trim(),
  falla_declarada: orden.fallaDeclarada.trim(),
  observaciones: orden.observaciones.trim(),
  reparacion: orden.reparacion.trim(),
  estado: orden.estado,
  tipo_bloqueo: orden.tipoBloqueo,
  codigo_bloqueo: orden.codigoBloqueo,
  fecha_entrega: orden.fechaEntrega || null, // PostgreSQL requiere null si la fecha está vacía
  presupuesto: Number(orden.presupuesto) || 0,
  recargo_porcentaje: Number(orden.recargoPorcentaje) || 0,
  abono: Number(orden.abono) || 0,
  forma_pago: orden.formaPago,
  repuesto_nombre: (orden.repuestoNombre || '').trim(),
  repuesto_serial: (orden.repuestoSerial || '').trim(),
  repuesto_precio: Number(orden.repuestoPrecio) || 0,
  mano_obra: Number(orden.manoObra) || 0,
  mostrar_repuesto_pdf: Boolean(orden.mostrarRepuestoPdf),
});

// Convierte una fila de la base de datos al formato de nuestra pantalla
export const mapearDesdeBD = (fila) => ({
  numero: fila.numero,
  fecha: fila.fecha || '',
  cliente: fila.cliente || '',
  documento: fila.documento || '',
  tipoEquipoOtro: fila.tipo_equipo_otro || '',
  telefono: fila.telefono || '',
  correo: fila.correo || '',
  tipoEquipo: fila.tipo_equipo || 'Celular',
  marca: fila.marca || '',
  modelo: fila.modelo || '',
  imei: fila.imei || '',
  accesorios: fila.accesorios || '',
  estadoFisico: fila.estado_fisico || '',
  fallaDeclarada: fila.falla_declarada || '',
  observaciones: fila.observaciones || '',
  reparacion: fila.reparacion || '',
  estado: fila.estado || 'Recibido',
  tipoBloqueo: fila.tipo_bloqueo || 'PATRON',
  codigoBloqueo: fila.codigo_bloqueo || '',
  fechaEntrega: fila.fecha_entrega || '',
  presupuesto: fila.presupuesto || 0,
  recargoPorcentaje: fila.recargo_porcentaje || 0,
  abono: fila.abono || 0,
  formaPago: fila.forma_pago || 'Efectivo',
  repuestoNombre: fila.repuesto_nombre || '',
  repuestoSerial: fila.repuesto_serial || '',
  repuestoPrecio: fila.repuesto_precio || 0,
  manoObra: fila.mano_obra || 0,
  mostrarRepuestoPdf: Boolean(fila.mostrar_repuesto_pdf),
});

// Guardar una orden nueva o actualizar una existente
export async function guardarOrden(orden) {
  const datos = mapearHaciaBD(orden);

  if (orden.numero) {
    const { data, error } = await supabase
      .from('ordenes_servicio')
      .update(datos)
      .eq('numero', orden.numero)
      .select()
      .single();

    if (error) throw error;
    return mapearDesdeBD(data);
  } else {
    const { data, error } = await supabase
      .from('ordenes_servicio')
      .insert([datos])
      .select()
      .single();

    if (error) throw error;
    return mapearDesdeBD(data);
  }
}

// Traer todas las órdenes ordenadas de la más reciente a la más antigua
export async function obtenerOrdenes() {
  const { data, error } = await supabase
    .from('ordenes_servicio')
    .select('*')
    .order('numero', { ascending: false });

  if (error) throw error;
  return data.map(mapearDesdeBD);
}

// Eliminar una orden por su número
export async function eliminarOrden(numero) {
  const { error } = await supabase
    .from('ordenes_servicio')
    .delete()
    .eq('numero', numero);

  if (error) throw error;
}