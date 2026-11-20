// Datos del taller (más adelante los conectaremos al módulo de Configuración)
const DATOS_TALLER = {
  nombre: 'KOMUNSERVER',
  subtitulo: 'Soporte Informático y Servicio Técnico',
  nit: 'NIT: 80.921.167-4',
  ciudad: 'Pereira - Colombia',
  telefono: '3103043323',
  web: 'www.komunserver.vercel.app',
  terminos:
    'Pasados 30 días sin retirar el equipo, el taller no se hace responsable por almacenamiento. Garantía de 30 días únicamente sobre la reparación realizada.',
};

// Función auxiliar para calcular totales exactos
const calcularFinanzas = (orden) => {
  const presupuesto = Number(orden.presupuesto) || 0;
  const recargoPct = Number(orden.recargoPorcentaje) || 0;
  const abono = Number(orden.abono) || 0;
  const recargo = (presupuesto * recargoPct) / 100;
  const total = presupuesto + recargo;
  const saldo = Math.max(0, total - abono);
  return { presupuesto, recargoPct, recargo, total, abono, saldo };
};

// Genera el dibujo visual del patrón en SVG para el PDF
const generarPatronSVG = (codigo) => {
  const puntos = [
    { id: 1, x: 18, y: 18 }, { id: 2, x: 50, y: 18 }, { id: 3, x: 82, y: 18 },
    { id: 4, x: 18, y: 50 }, { id: 5, x: 50, y: 50 }, { id: 6, x: 82, y: 50 },
    { id: 7, x: 18, y: 82 }, { id: 8, x: 50, y: 82 }, { id: 9, x: 82, y: 82 },
  ];
  const seq = codigo.split('-').map(Number);

  const lineas = seq
    .map((id, i) => {
      if (i === 0) return '';
      const a = puntos.find((p) => p.id === seq[i - 1]);
      const b = puntos.find((p) => p.id === id);
      if (!a || !b) return '';
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#0284c7" stroke-width="3" stroke-linecap="round" />`;
    })
    .join('');

  const circulos = puntos
    .map((p) => {
      const idx = seq.indexOf(p.id);
      const activo = idx !== -1;
      return `
        <circle cx="${p.x}" cy="${p.y}" r="${activo ? 9 : 6}" fill="${activo ? '#0284c7' : '#e2e8f0'}" stroke="#0f172a" stroke-width="1.2" />
        ${activo ? `<text x="${p.x}" y="${p.y + 3.5}" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">${idx + 1}</text>` : ''}
      `;
    })
    .join('');

  return `<svg width="95" height="95" viewBox="0 0 100 100" style="border:1px solid #cbd5e1; border-radius:6px; background:#f8fafc;">${lineas}${circulos}</svg>`;
};

// 1. ENVIAR POR WHATSAPP
export function enviarWhatsApp(orden, config = DATOS_TALLER) {
  const taller = { ...DATOS_TALLER, ...config };
  if (!orden.telefono || !orden.telefono.trim()) {
    alert('Escribe un número de teléfono/WhatsApp para enviar el mensaje.');
    return;
  }

  let numero = orden.telefono.replace(/\D/g, '');
  if (numero.length === 10) {
    numero = '57' + numero;
  }

  const { total, abono, saldo } = calcularFinanzas(orden);
  const numOrden = orden.numero ? `#${orden.numero}` : '(Sin guardar)';

  const mensaje = [
    `*${taller.nombre} - Orden de Servicio ${numOrden}*`,
    `Hola *${orden.cliente || 'Cliente'}*, aquí tienes el resumen de tu equipo:`,
    ``,
   `📱 *Equipo:* ${orden.tipoEquipo === 'Otros' && orden.tipoEquipoOtro ? orden.tipoEquipoOtro : orden.tipoEquipo} ${orden.marca} ${orden.modelo}`,
    `🔧 *Falla:* ${orden.fallaDeclarada || 'En revisión'}`,
    `📌 *Estado actual:* ${orden.estado}`,
    orden.fechaEntrega ? `📅 *Entrega estimada:* ${orden.fechaEntrega}` : null,
    ``,
    `💰 *Total del servicio:* $${total.toLocaleString('es-CO')}`,
    abono > 0 ? `💵 *Abono:* $${abono.toLocaleString('es-CO')}` : null,
    `🧾 *Saldo pendiente:* $${saldo.toLocaleString('es-CO')}`,
    ``,
    `Gracias por confiar en nosotros.`,
  ]
    .filter(Boolean)
    .join('\n');

  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

// 2. IMPRIMIR TICKET TÉRMICO 80MM
export function imprimirTicket80mm(orden, config = DATOS_TALLER) {
  const taller = { ...DATOS_TALLER, ...config };
  const { presupuesto, recargo, total, abono, saldo } = calcularFinanzas(orden);
  const ventana = window.open('', '_blank', 'width=350,height=600');

  ventana.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket Orden #${orden.numero || 'Nueva'}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body {
          font-family: 'Courier New', monospace;
          width: 72mm;
          margin: 0 auto;
          padding: 8px 4px;
          font-size: 12px;
          color: #000;
        }
        .centro { text-align: center; }
        .negrita { font-weight: bold; }
        .linea { border-top: 1px dashed #000; margin: 8px 0; }
        .fila { display: flex; justify-content: space-between; margin: 3px 0; }
        .titulo { font-size: 15px; font-weight: bold; margin: 0; }
        .pequeno { font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="centro">
      ${taller.logo_url ? `<img src="${taller.logo_url}" style="max-height:45px; margin-bottom:4px;" />` : ''}
        <p class="titulo">${taller.nombre}</p>
        <div class="pequeno">${taller.subtitulo}</div>
        <div class="pequeno">${taller.nit} | Tel: ${taller.telefono}</div>
        <div class="pequeno">${taller.ciudad}</div>
      </div>

      <div class="linea"></div>
      <div class="fila negrita">
        <span>ORDEN: #${orden.numero || 'PENDIENTE'}</span>
        <span>${orden.fecha}</span>
      </div>
      <div><b>Cliente:</b> ${orden.cliente || '-'}</div>
      ${orden.documento ? `<div><b>Doc:</b> ${orden.documento}</div>` : ''}
      <div><b>Tel:</b> ${orden.telefono || '-'}</div>
      <div><b>Estado:</b> ${orden.estado}</div>

      <div class="linea"></div>
      <div><b>Equipo:</b> ${orden.tipoEquipo === 'Otros' && orden.tipoEquipoOtro ? orden.tipoEquipoOtro : orden.tipoEquipo} ${orden.marca} ${orden.modelo}</div>
      ${orden.imei ? `<div><b>IMEI/Serie:</b> ${orden.imei}</div>` : ''}
      ${orden.accesorios ? `<div><b>Accesorios:</b> ${orden.accesorios}</div>` : ''}
      ${orden.codigoBloqueo ? `<div><b>${orden.tipoBloqueo === 'PIN' ? 'PIN' : 'Patrón'}:</b> ${orden.codigoBloqueo}</div>` : ''}
      <div><b>Falla:</b> ${orden.fallaDeclarada || '-'}</div>
      ${orden.repuestoSerial ? `<div><b>S/N Repuesto:</b> ${orden.repuestoSerial}</div>` : ''}
      ${orden.fechaEntrega ? `<div><b>Entrega est.:</b> ${orden.fechaEntrega}</div>` : ''}

      <div class="linea"></div>
      ${
        orden.mostrarRepuestoPdf && orden.repuestoNombre
          ? `<div class="fila"><span>Rep: ${orden.repuestoNombre}</span><span>$${Number(orden.repuestoPrecio).toLocaleString('es-CO')}</span></div>
             <div class="fila"><span>Mano de obra:</span><span>$${Number(orden.manoObra).toLocaleString('es-CO')}</span></div>`
          : ''
      }
      <div class="fila"><span>Presupuesto:</span><span>$${presupuesto.toLocaleString('es-CO')}</span></div>
      ${recargo > 0 ? `<div class="fila"><span>Recargo:</span><span>$${recargo.toLocaleString('es-CO')}</span></div>` : ''}
      <div class="fila negrita"><span>TOTAL:</span><span>$${total.toLocaleString('es-CO')}</span></div>
      <div class="fila"><span>Abono:</span><span>$${abono.toLocaleString('es-CO')}</span></div>
      <div class="fila negrita"><span>SALDO:</span><span>$${saldo.toLocaleString('es-CO')}</span></div>

      <div class="linea"></div>
      <div class="centro pequeno">${DATOS_TALLER.terminos}</div>
      <br/><br/>
      <div class="centro pequeno">__________________________<br/>Firma del Cliente</div>
    </body>
    </html>
  `);

  ventana.document.close();
  ventana.focus();
  setTimeout(() => ventana.print(), 300);
}

// 3. GENERAR COMPROBANTE PDF (FORMATO HOJA)
export function generarComprobantePDF(orden, config = DATOS_TALLER) {
  const taller = { ...DATOS_TALLER, ...config };
  const { presupuesto, recargoPct, recargo, total, abono, saldo } = calcularFinanzas(orden);
  const ventana = window.open('', '_blank', 'width=850,height=900');

  ventana.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Orden de Servicio #${orden.numero || 'Nueva'}</title>
      <style>
        @page { size: letter; margin: 12mm; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 20px;
          font-size: 13px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .empresa h1 { margin: 0; font-size: 22px; color: #0f172a; }
        .empresa p { margin: 2px 0; font-size: 12px; color: #475569; }
        .caja-orden {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 10px 16px;
          border-radius: 8px;
          text-align: right;
        }
        .caja-orden .num { font-size: 20px; font-weight: bold; color: #0284c7; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
        .card h3 {
          margin: 0 0 8px 0;
          font-size: 11px;
          text-transform: uppercase;
          color: #0284c7;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .dato { margin: 4px 0; }
        .dato b { color: #0f172a; }
        .totales {
          width: 300px;
          margin-left: auto;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px;
          background: #f8fafc;
        }
        .fila { display: flex; justify-content: space-between; margin: 5px 0; gap: 8px; }
        .fila.grande { font-size: 16px; font-weight: bold; border-top: 1px solid #cbd5e1; padding-top: 6px; color: #0f172a; }
        .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; text-align: center; }
        .linea-firma { border-top: 1px solid #475569; padding-top: 6px; font-size: 12px; }
        .terminos { margin-top: 20px; font-size: 11px; color: #64748b; text-align: justify; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="empresa" style="display:flex; align-items:center; gap:14px;">
          ${taller.logo_url ? `<img src="${taller.logo_url}" style="height:65px; width:auto; object-fit:contain;" />` : ''}
          <div>
            <h1>${taller.nombre}</h1>
            <p>${taller.subtitulo}</p>
            <p>${taller.nit} • ${taller.ciudad} • Tel: ${taller.telefono}</p>
            <p>${taller.web}</p>
          </div>
        </div>
        <div class="caja-orden">
          <div style="font-size:11px; color:#64748b;">ORDEN DE SERVICIO</div>
          <div class="num">#${orden.numero || 'PENDIENTE'}</div>
          <div style="font-size:12px;">Fecha: ${orden.fecha}</div>
          <div style="font-size:12px; font-weight:bold;">Estado: ${orden.estado}</div>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Datos del Cliente</h3>
          <div class="dato"><b>Nombre:</b> ${orden.cliente || '-'}</div>
          <div class="dato"><b>Documento:</b> ${orden.documento || '-'}</div>
          <div class="dato"><b>Teléfono:</b> ${orden.telefono || '-'}</div>
          <div class="dato"><b>Dirección / Correo:</b> ${orden.correo || '-'}</div>
          <div class="dato"><b>Entrega estimada:</b> ${orden.fechaEntrega || 'Por confirmar'}</div>
        </div>
        <div class="card">
          <h3>Datos del Equipo</h3>
          <div class="dato"><b>Tipo:</b> ${orden.tipoEquipo === 'Otros' && orden.tipoEquipoOtro ? orden.tipoEquipoOtro : orden.tipoEquipo}</div>
          <div class="dato"><b>Marca / Modelo:</b> ${orden.marca || '-'} ${orden.modelo || ''}</div>
          <div class="dato"><b>IMEI / Serie:</b> ${orden.imei || '-'}</div>
          <div class="dato"><b>Accesorios:</b> ${orden.accesorios || 'Ninguno'}</div>
          ${
            orden.codigoBloqueo
              ? `<div class="dato" style="margin-top:8px;">
                   <b>${orden.tipoBloqueo === 'PIN' ? 'PIN / Clave:' : 'Patrón de desbloqueo:'}</b> ${orden.codigoBloqueo}
                   ${orden.tipoBloqueo === 'PATRON' ? `<div style="margin-top:4px;">${generarPatronSVG(orden.codigoBloqueo)}</div>` : ''}
                 </div>`
              : ''
          }
        </div>
      </div>

      <div class="card" style="margin-bottom: 14px;">
        <h3>Diagnóstico y Trabajo</h3>
        <div class="dato"><b>Estado físico al recibir:</b> ${orden.estadoFisico || '-'}</div>
        <div class="dato"><b>Falla declarada:</b> ${orden.fallaDeclarada || '-'}</div>
        <div class="dato"><b>Trabajo / Reparación:</b> ${orden.reparacion || 'En proceso de diagnóstico'}</div>
        ${
          orden.repuestoSerial
            ? `<div class="dato"><b>Serial del repuesto instalado (Garantía):</b> <span style="font-family:monospace; font-weight:bold;">${orden.repuestoSerial}</span></div>`
            : ''
        }
      </div>

      <div class="totales">
        ${
          orden.mostrarRepuestoPdf && orden.repuestoNombre
            ? `<div class="fila"><span>Repuesto (${orden.repuestoNombre}):</span><span>$${Number(orden.repuestoPrecio).toLocaleString('es-CO')}</span></div>
               <div class="fila"><span>Mano de obra:</span><span>$${Number(orden.manoObra).toLocaleString('es-CO')}</span></div>`
            : ''
        }
        <div class="fila"><span>Presupuesto:</span><span>$${presupuesto.toLocaleString('es-CO')}</span></div>
        ${recargo > 0 ? `<div class="fila"><span>Recargo (${recargoPct}%):</span><span>$${recargo.toLocaleString('es-CO')}</span></div>` : ''}
        <div class="fila grande"><span>Total Servicio:</span><span>$${total.toLocaleString('es-CO')}</span></div>
        <div class="fila"><span>Abono (${orden.formaPago}):</span><span>$${abono.toLocaleString('es-CO')}</span></div>
        <div class="fila" style="font-weight:bold; color:#b45309;"><span>Saldo Pendiente:</span><span>$${saldo.toLocaleString('es-CO')}</span></div>
      </div>

      <div class="firmas">
        <div class="linea-firma">Recibido por (${DATOS_TALLER.nombre})</div>
        <div class="linea-firma">Firma de conformidad del Cliente</div>
      </div>

      <div class="terminos"><b>Términos y Condiciones:</b> ${DATOS_TALLER.terminos}</div>
    </body>
    </html>
  `);

  ventana.document.close();
  ventana.focus();
  setTimeout(() => ventana.print(), 300);
}