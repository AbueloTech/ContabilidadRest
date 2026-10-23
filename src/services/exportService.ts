import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Transaction, CashClosure, BusinessSettings, DashboardStats } from '../types';

export const exportService = {
  // -------------------------------------------------------------
  // Excel Export: Libro Diario / Asientos Contables
  // -------------------------------------------------------------
  exportTransactionsToExcel: (
    transactions: Transaction[],
    settings: BusinessSettings,
    periodLabel: string = 'Libro_Diario'
  ) => {
    const data = transactions.map((t) => ({
      'ID Asiento': t.id,
      Fecha: t.date,
      Hora: t.time || '',
      Tipo: t.type === 'ingreso' ? 'Ingreso' : 'Egreso',
      Concepto: t.category_name,
      Subconcepto: t.subcategory_name || 'N/A',
      'Método de Pago': formatPaymentMethod(t.payment_method),
      Comprobante: t.reference_number || '',
      Monto: t.amount,
      Impuestos: t.tax_amount || 0,
      'Registrado Por': t.user_name || 'Sistema',
      Descripción: t.description || '',
    }));

    // Calculate totals
    const totalIngresos = transactions
      .filter((t) => t.type === 'ingreso')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalEgresos = transactions
      .filter((t) => t.type === 'egreso')
      .reduce((sum, t) => sum + t.amount, 0);

    const summaryData = [
      { Métrica: 'Empresa', Valor: settings.business_name },
      { Métrica: 'Identificación Fiscal', Valor: settings.tax_id },
      { Métrica: 'Moneda', Valor: settings.currency_code },
      { Métrica: 'Total Ingresos', Valor: totalIngresos },
      { Métrica: 'Total Egresos', Valor: totalEgresos },
      { Métrica: 'Balance Neto', Valor: totalIngresos - totalEgresos },
      { Métrica: 'Total Asientos', Valor: transactions.length },
      { Métrica: 'Fecha de Emisión', Valor: new Date().toLocaleDateString('es-ES') },
    ];

    const wb = XLSX.utils.book_new();

    const wsTransactions = XLSX.utils.json_to_sheet(data);
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);

    // Auto width
    wsTransactions['!cols'] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 8 },
      { wch: 10 },
      { wch: 22 },
      { wch: 22 },
      { wch: 18 },
      { wch: 15 },
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 30 },
    ];
    wsSummary['!cols'] = [{ wch: 24 }, { wch: 30 }];

    XLSX.utils.book_append_sheet(wb, wsTransactions, 'Asientos Contables');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Contable');

    const fileName = `Contabilidad_${sanitizeFilename(settings.business_name)}_${periodLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  },

  // -------------------------------------------------------------
  // PDF Export: Libro Diario / Asientos Contables
  // -------------------------------------------------------------
  exportTransactionsToPDF: (
    transactions: Transaction[],
    settings: BusinessSettings,
    filterTitle: string = 'Todos los registros'
  ) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header styling
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.business_name.toUpperCase(), 14, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rif/NIT: ${settings.tax_id} | ${settings.address || 'Local Comercial'}`, 14, 18);
    doc.text(`LIBRO DIARIO DE CAJA Y CONTABILIDAD`, 200, 12);
    doc.text(`Emisión: ${new Date().toLocaleDateString('es-ES')} | Filtro: ${filterTitle}`, 200, 18);

    // Summary calculation
    const totalIngresos = transactions
      .filter((t) => t.type === 'ingreso')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalEgresos = transactions
      .filter((t) => t.type === 'egreso')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIngresos - totalEgresos;

    // Summary banner
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 28, 269, 14, 2, 2, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Entradas: ${settings.currency_symbol} ${formatNumber(totalIngresos)}`, 20, 36);
    doc.text(`Total Salidas: ${settings.currency_symbol} ${formatNumber(totalEgresos)}`, 105, 36);
    doc.text(
      `Saldo Neto: ${settings.currency_symbol} ${formatNumber(balance)} (${balance >= 0 ? 'Superávit' : 'Déficit'})`,
      190,
      36
    );

    // Table
    const tableBody = transactions.map((t) => [
      t.date,
      t.time || '',
      t.type === 'ingreso' ? 'Ingreso' : 'Egreso',
      t.category_name,
      t.subcategory_name || '-',
      formatPaymentMethod(t.payment_method),
      t.reference_number || '-',
      `${settings.currency_symbol} ${formatNumber(t.amount)}`,
      t.description || '',
    ]);

    autoTable(doc, {
      startY: 46,
      head: [
        [
          'Fecha',
          'Hora',
          'Tipo',
          'Concepto',
          'Subconcepto',
          'Método Pago',
          'Comprobante',
          'Monto',
          'Detalle / Notas',
        ],
      ],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 14 },
        2: { cellWidth: 18 },
        3: { cellWidth: 35 },
        4: { cellWidth: 35 },
        5: { cellWidth: 28 },
        6: { cellWidth: 25 },
        7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 'auto' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          if (data.cell.raw === 'Ingreso') {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    const fileName = `Libro_Diario_${sanitizeFilename(settings.business_name)}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  },

  // -------------------------------------------------------------
  // PDF Export: Estado de Resultados Mensual / Reporte Financiero
  // -------------------------------------------------------------
  exportMonthlyReportToPDF: (
    stats: DashboardStats,
    settings: BusinessSettings,
    periodLabel: string
  ) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.business_name.toUpperCase(), 14, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Identificación: ${settings.tax_id} | ${settings.address || ''}`, 14, 18);
    doc.text(`ESTADO DE INGRESOS Y EGRESOS - ${periodLabel}`, 14, 24);

    let currentY = 36;

    // Financial KPI Summary Cards
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, currentY, 56, 22, 2, 2, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('TOTAL INGRESOS', 18, currentY + 6);
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${settings.currency_symbol} ${formatNumber(stats.totalIncome)}`, 18, currentY + 16);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(77, currentY, 56, 22, 2, 2, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL GASTOS', 81, currentY + 6);
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${settings.currency_symbol} ${formatNumber(stats.totalExpenses)}`, 81, currentY + 16);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(140, currentY, 56, 22, 2, 2, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('UTILIDAD / MARGEN', 144, currentY + 6);
    doc.setTextColor(stats.netProfit >= 0 ? 37 : 239, stats.netProfit >= 0 ? 99 : 68, stats.netProfit >= 0 ? 235 : 68);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `${settings.currency_symbol} ${formatNumber(stats.netProfit)} (${stats.profitMargin.toFixed(1)}%)`,
      144,
      currentY + 16
    );

    currentY += 28;

    // Breakdown: Gastos Fijos vs Variables
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, currentY, 182, 14, 2, 2, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Gastos Fijos (Alquiler, Luz, Agua, etc.): ${settings.currency_symbol} ${formatNumber(stats.fixedExpenses)}`,
      18,
      currentY + 6
    );
    doc.text(
      `Gastos Variables (Insumos, Compras): ${settings.currency_symbol} ${formatNumber(stats.variableExpenses)}`,
      18,
      currentY + 11
    );

    currentY += 20;

    // Subconcept Breakdown: Víveres & Insumos
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Desglose de Víveres e Ingredientes de Cocina', 14, currentY);

    const groceriesRows = stats.groceriesBreakdown.map((g) => [
      g.subcategory_name || 'Sin subconcepto',
      `${settings.currency_symbol} ${formatNumber(g.total)}`,
      stats.totalExpenses > 0 ? `${((g.total / stats.totalExpenses) * 100).toFixed(1)}% del gasto` : '0%',
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Subconcepto de Víveres', 'Total Invertido', '% del Gasto Total']],
      body: groceriesRows.length ? groceriesRows : [['No hay registros este mes', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    const lastTable = (doc as any).lastAutoTable;
    currentY = lastTable ? lastTable.finalY + 10 : currentY + 40;

    // Subconcept Breakdown: Gastos Fijos & Servicios
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Desglose de Gastos Fijos, Servicios y Mantenimiento', 14, currentY);

    const fixedRows = stats.fixedBreakdown.map((f) => [
      f.subcategory_name || 'Sin subconcepto',
      `${settings.currency_symbol} ${formatNumber(f.total)}`,
      stats.totalExpenses > 0 ? `${((f.total / stats.totalExpenses) * 100).toFixed(1)}% del gasto` : '0%',
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Concepto / Servicio Fijo', 'Total Facturado', '% del Gasto Total']],
      body: fixedRows.length ? fixedRows : [['No hay registros este mes', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    const fileName = `Estado_Resultados_${sanitizeFilename(settings.business_name)}_${periodLabel}.pdf`;
    doc.save(fileName);
  },

  // -------------------------------------------------------------
  // PDF Export: Acta de Cierre de Caja (Diario / Mensual)
  // -------------------------------------------------------------
  exportClosureCertificateToPDF: (closure: CashClosure, settings: BusinessSettings) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Border Frame
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(10, 10, 190, 25, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.business_name.toUpperCase(), 15, 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`ACTA FORMAL DE CIERRE DE CAJA - PERÍODO: ${closure.period_label.toUpperCase()}`, 15, 30);

    let y = 45;

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DE LA AUDITORÍA Y ARQUEO', 15, y);

    y += 8;
    const closureDetails = [
      ['Tipo de Cierre', closure.period_type.toUpperCase()],
      ['Período Auditado', `${closure.start_date} al ${closure.end_date}`],
      ['Responsable de Cierre', closure.closed_by_user],
      ['Fecha y Hora de Sellado', new Date(closure.closed_at).toLocaleString('es-ES')],
      ['Estado del Cierre', closure.status.toUpperCase()],
    ];

    autoTable(doc, {
      startY: y,
      body: closureDetails,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
      margin: { left: 15, right: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESULTADO FINANCIERO Y CONCILIACIÓN DE EFECTIVO', 15, y);

    y += 8;
    const diffStatus =
      closure.cash_difference === 0
        ? 'CUADRADO PERFECTO'
        : closure.cash_difference > 0
        ? `SOBRANTE (+${settings.currency_symbol} ${formatNumber(closure.cash_difference)})`
        : `FALTANTE (${settings.currency_symbol} ${formatNumber(closure.cash_difference)})`;

    const finDetails = [
      ['Total Entradas / Ingresos Contabilizados', `${settings.currency_symbol} ${formatNumber(closure.total_income)}`],
      ['Total Salidas / Egresos Contabilizados', `${settings.currency_symbol} ${formatNumber(closure.total_expenses)}`],
      ['Saldo Neto Contable del Período', `${settings.currency_symbol} ${formatNumber(closure.net_balance)}`],
      ['Efectivo Teórico Esperado en Caja', `${settings.currency_symbol} ${formatNumber(closure.expected_cash)}`],
      ['Efectivo Físico Arqueado y Contado', `${settings.currency_symbol} ${formatNumber(closure.counted_cash)}`],
      ['Diferencia de Caja Detectada', diffStatus],
    ];

    autoTable(doc, {
      startY: y,
      body: finDetails,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 15, right: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Observaciones
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Observaciones del Responsable:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(closure.notes || 'Sin observaciones adicionales registradas.', 15, y + 6, {
      maxWidth: 180,
    });

    // Signature boxes
    y += 40;
    doc.setDrawColor(148, 163, 184);
    doc.line(25, y, 85, y);
    doc.line(125, y, 185, y);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Firma y Sello del Cajero / Operador', 30, y + 5);
    doc.text('Firma y Sello de Gerencia / Contador', 130, y + 5);

    const fileName = `Cierre_Caja_${closure.period_type}_${closure.period_label.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  },
};

function formatPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta_debito: 'Tarjeta Débito',
    tarjeta_credito: 'Tarjeta Crédito',
    transferencia: 'Transferencia Bancaria',
    pago_movil_zelle: 'Pago Móvil / Zelle',
    otro: 'Otro Método',
  };
  return map[method] || method;
}

function formatNumber(num: number): string {
  return (num || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}
