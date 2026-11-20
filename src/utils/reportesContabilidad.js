import * as XLSX from 'xlsx';

/**
 * Exporta los movimientos de caja a un archivo Excel (.xlsx)
 */
export function exportarContabilidadExcel(movimientos = [], resumen = {}) {
  const filas = movimientos.map((m) => ({
    Fecha: m.fecha || '',
    Tipo: m.tipo || '',
    Concepto: m.concepto || '',
    'Forma de Pago': m.forma_pago || m.formaPago || 'Efectivo',
    Monto: Number(m.monto) || 0,
  }));

  // Fila en blanco y resumen al final del Excel
  filas.push({});
  filas.push({ Concepto: 'TOTAL INGRESOS', Monto: Number(resumen.ingresos) || 0 });
  filas.push({ Concepto: 'TOTAL EGRESOS', Monto: Number(resumen.egresos) || 0 });
  filas.push({ Concepto: 'BALANCE NETO', Monto: Number(resumen.balance) || 0 });

  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 40 },
    { wch: 18 },
    { wch: 15 },
  ];

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Contabilidad');

  const fechaHoy = new Date().toISOString().split('T')[0];
  XLSX.writeFile(libro, `Contabilidad_Caja_${fechaHoy}.xlsx`);
}

/**
 * Abre una ventana lista para imprimir el Cierre de Caja (PDF o impresora)
 */
export function imprimirCierreCaja(movimientos = [], resumen = {}, configTaller = {}) {
  const nombreTaller = configTaller.nombre || 'KOMUNSERVER';
  const fechaHoy = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const filasHtml = movimientos
    .map(
      (m) => `
      <tr>
        <td>${m.fecha || ''}</td>
        <td>${m.tipo || ''}</td>
        <td>${m.concepto || ''}</td>
        <td>${m.forma_pago || m.formaPago || 'Efectivo'}</td>
        <td style="text-align:right; font-weight:600; color:${
          (m.tipo || '').toLowerCase() === 'egreso' ? '#dc2626' : '#059669'
        };">
          ${(m.tipo || '').toLowerCase() === 'egreso' ? '-' : '+'}$${(Number(m.monto) || 0).toLocaleString('es-CO')}
        </td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Cierre de Caja - ${nombreTaller}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #1e293b; padding: 24px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 2px 0; font-size: 12px; color: #475569; }
        .cards { display: flex; gap: 12px; margin-bottom: 20px; }
        .card { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
        .card span { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; }
        .card strong { font-size: 18px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: left; }
        th { background: #f1f5f9; font-weight: 700; }
        .footer { margin-top: 30px; font-size: 11px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>${nombreTaller} — Cierre de Caja</h1>
          <p>${configTaller.nit || ''} ${configTaller.ciudad ? '• ' + configTaller.ciudad : ''}</p>
        </div>
        <div style="text-align:right;">
          <p><strong>Generado:</strong> ${fechaHoy}</p>
          <p><strong>Movimientos:</strong> ${movimientos.length}</p>
        </div>
      </div>

      <div class="cards">
        <div class="card">
          <span>Total Ingresos</span>
          <strong style="color:#059669;">$${(Number(resumen.ingresos) || 0).toLocaleString('es-CO')}</strong>
        </div>
        <div class="card">
          <span>Total Egresos</span>
          <strong style="color:#dc2626;">$${(Number(resumen.egresos) || 0).toLocaleString('es-CO')}</strong>
        </div>
        <div class="card">
          <span>Balance Neto</span>
          <strong style="color:#0284c7;">$${(Number(resumen.balance) || 0).toLocaleString('es-CO')}</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Concepto</th>
            <th>Forma de Pago</th>
            <th style="text-align:right;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${filasHtml || '<tr><td colspan="5" style="text-align:center;">No hay movimientos registrados</td></tr>'}
        </tbody>
      </table>

      <div class="footer">Reporte generado automáticamente por el Sistema de Gestión de Taller</div>
      <script>window.onload = () => { window.print(); };</script>
    </body>
    </html>
  `;

  const ventana = window.open('', '_blank', 'width=900,height=700');
  if (ventana) {
    ventana.document.write(html);
    ventana.document.close();
  }
}