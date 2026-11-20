-- ==========================================
-- INSTALACIÓN COMPLETA - SISTEMA DE TALLER
-- ==========================================

-- 1. Tabla de Órdenes de Servicio
CREATE TABLE IF NOT EXISTS ordenes_servicio (
  numero BIGSERIAL PRIMARY KEY,
  fecha DATE DEFAULT CURRENT_DATE,
  cliente TEXT NOT NULL,
  documento TEXT DEFAULT '',
  telefono TEXT DEFAULT '',
  correo TEXT DEFAULT '',
  tipo_equipo TEXT DEFAULT 'Celular',
  tipo_equipo_otro TEXT DEFAULT '',
  marca TEXT DEFAULT '',
  modelo TEXT DEFAULT '',
  imei TEXT DEFAULT '',
  accesorios TEXT DEFAULT '',
  estado_fisico TEXT DEFAULT '',
  falla_declarada TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  reparacion TEXT DEFAULT '',
  estado TEXT DEFAULT 'Recibido',
  tipo_bloqueo TEXT DEFAULT 'PATRON',
  codigo_bloqueo TEXT DEFAULT '',
  fecha_entrega DATE,
  presupuesto NUMERIC DEFAULT 0,
  recargo_porcentaje NUMERIC DEFAULT 0,
  abono NUMERIC DEFAULT 0,
  forma_pago TEXT DEFAULT 'Efectivo',
  repuesto_nombre TEXT DEFAULT '',
  repuesto_serial TEXT DEFAULT '',
  repuesto_precio NUMERIC DEFAULT 0,
  mano_obra NUMERIC DEFAULT 0,
  mostrar_repuesto_pdf BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Repuestos (Inventario)
CREATE TABLE IF NOT EXISTS repuestos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  modelo TEXT DEFAULT '',
  precio NUMERIC DEFAULT 0,
  stock INT DEFAULT 0,
  usa_serial BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Seriales por Repuesto
CREATE TABLE IF NOT EXISTS repuestos_seriales (
  id BIGSERIAL PRIMARY KEY,
  repuesto_id BIGINT REFERENCES repuestos(id) ON DELETE CASCADE,
  serial TEXT UNIQUE NOT NULL,
  estado TEXT DEFAULT 'disponible',
  orden_numero BIGINT,
  fecha_vencimiento DATE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Movimientos de Caja (Contabilidad)
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL,
  concepto TEXT NOT NULL,
  monto NUMERIC NOT NULL DEFAULT 0,
  forma_pago TEXT DEFAULT 'Efectivo',
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Configuración del Taller
CREATE TABLE IF NOT EXISTS configuracion_taller (
  id INT PRIMARY KEY DEFAULT 1,
  nombre TEXT NOT NULL DEFAULT 'MI TALLER TÉCNICO',
  subtitulo TEXT DEFAULT 'Soporte Informático y Servicio Técnico',
  nit TEXT DEFAULT 'NIT: 000.000.000-0',
  ciudad TEXT DEFAULT 'Ciudad - País',
  telefono TEXT DEFAULT '0000000000',
  web TEXT DEFAULT '',
  terminos TEXT DEFAULT 'Pasados 30 días sin retirar el equipo, el taller no se hace responsable por almacenamiento. Garantía de 30 días únicamente sobre la reparación realizada.',
  logo_url TEXT DEFAULT '',
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO configuracion_taller (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Permisos de acceso para la aplicación
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER TABLE ordenes_servicio DISABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos DISABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos_seriales DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja DISABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_taller DISABLE ROW LEVEL SECURITY;