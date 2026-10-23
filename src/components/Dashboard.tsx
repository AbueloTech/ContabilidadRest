import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Building,
  Apple,
  FileText,
  FileSpreadsheet,
  PlusCircle,
  ArrowRight,
  Calendar,
  Layers,
  ChevronRight,
  PieChart as PieIcon,
  Receipt,
} from 'lucide-react';
import { DashboardStats, BusinessSettings, Transaction, User } from '../types';
import { api } from '../services/api';
import { exportService } from '../services/exportService';

interface DashboardProps {
  settings: BusinessSettings;
  currentUser: User;
  onOpenNewTransaction: () => void;
  onNavigateToLedger: () => void;
  onNavigateToClosure: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  settings,
  currentUser,
  onOpenNewTransaction,
  onNavigateToLedger,
  onNavigateToClosure,
}) => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()));
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const months = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  const years = ['2025', '2026', '2027'];

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboardStats(selectedMonth, selectedYear);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar métricas del tablero');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [selectedMonth, selectedYear]);

  const monthLabel = months.find((m) => m.value === selectedMonth)?.label || 'Mes actual';
  const periodTitle = `${monthLabel} ${selectedYear}`;

  const handleExportPDF = () => {
    if (!stats) return;
    exportService.exportMonthlyReportToPDF(stats, settings, periodTitle);
  };

  const handleExportExcel = async () => {
    try {
      const monthPrefix = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
      const transactions = await api.getTransactions({
        startDate: `${monthPrefix}-01`,
        endDate: `${monthPrefix}-31`,
      });
      exportService.exportTransactionsToExcel(transactions, settings, periodTitle);
    } catch (err: any) {
      alert('Error al exportar Excel: ' + err.message);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Calculando estado contable en tiempo real...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-rose-300 text-sm">
        {error || 'No se pudieron cargar los datos'}
      </div>
    );
  }

  // Calculate max for daily chart scaling
  const maxDailyValue = Math.max(
    ...stats.dailyTrend.map((d) => Math.max(d.income, d.expenses)),
    100
  );

  return (
    <div className="space-y-6">
      {/* Top Bar: Period Selector & Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Calendar className="w-4 h-4" />
              <span>Tablero Contable y Financiero</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <span>{periodTitle}</span>
              <span className="text-xs font-normal text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                {stats.transactionCount} asientos contables
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Month & Year Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white px-2 py-1.5 focus:outline-none cursor-pointer"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value} className="bg-slate-900">
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white px-2 py-1.5 focus:outline-none border-l border-slate-800 cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y} className="bg-slate-900">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Buttons */}
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Descargar informe financiero en formato PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Descargar datos y asientos a Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>

            {/* New Transaction CTA */}
            <button
              onClick={onOpenNewTransaction}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer ml-auto md:ml-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nuevo Asiento</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingresos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Entradas / Ingresos</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {settings.currency_symbol} {formatNum(stats.totalIncome)}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
            <span>Ventas salón, delivery y servicios</span>
          </div>
        </div>

        {/* Total Salidas / Gastos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Salidas / Egresos</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {settings.currency_symbol} {formatNum(stats.totalExpenses)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Fijos: {settings.currency_symbol}{formatNum(stats.fixedExpenses)}</span>
            <span>Var: {settings.currency_symbol}{formatNum(stats.variableExpenses)}</span>
          </div>
        </div>

        {/* Utilidad / Saldo Neto */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resultado / Saldo Neto</span>
            <div
              className={`p-2 rounded-xl ${
                stats.netProfit >= 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-extrabold ${
              stats.netProfit >= 0 ? 'text-blue-400' : 'text-rose-400'
            }`}
          >
            {settings.currency_symbol} {formatNum(stats.netProfit)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>Margen operativo: </span>
            <strong className="text-white font-semibold">{stats.profitMargin.toFixed(1)}%</strong>
          </div>
        </div>

        {/* Efectivo en Mano / Flujo de Caja */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Flujo de Efectivo Físico</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {settings.currency_symbol} {formatNum(stats.cashInHand + (settings.initial_cash_fund || 0))}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Cobrado menos pagado en efectivo</span>
            <button
              onClick={onNavigateToClosure}
              className="text-amber-400 hover:underline cursor-pointer font-medium"
            >
              Arqueo →
            </button>
          </div>
        </div>
      </div>

      {/* Highlights: Víveres (Harina, Aceite, Charcutería, Verduras) & Gastos Fijos (Alquiler, Luz, Gas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Subconceptos de Víveres e Ingredientes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <Apple className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Víveres e Insumos Gastronómicos</h3>
                <p className="text-[11px] text-slate-400">
                  Desglose de compras: harina, aceites, charcutería, carnes y verduras
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-rose-400">
              {settings.currency_symbol}{' '}
              {formatNum(stats.groceriesBreakdown.reduce((acc, curr) => acc + curr.total, 0))}
            </span>
          </div>

          <div className="space-y-3">
            {stats.groceriesBreakdown.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No hay compras de víveres registradas en este período.
              </div>
            ) : (
              stats.groceriesBreakdown.map((item, idx) => {
                const totalGroc = stats.groceriesBreakdown.reduce((acc, curr) => acc + curr.total, 0);
                const percent = totalGroc > 0 ? (item.total / totalGroc) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{item.subcategory_name || 'General'}</span>
                      <span className="text-white font-bold">
                        {settings.currency_symbol} {formatNum(item.total)}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({percent.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Gastos Fijos (Alquiler, Luz, Agua, Teléfono, Gas) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Gastos Fijos y Servicios Básicos</h3>
                <p className="text-[11px] text-slate-400">
                  Alquiler, electricidad, agua, gas industrial y comunicaciones
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-orange-400">
              {settings.currency_symbol}{' '}
              {formatNum(stats.fixedBreakdown.reduce((acc, curr) => acc + curr.total, 0))}
            </span>
          </div>

          <div className="space-y-3">
            {stats.fixedBreakdown.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No hay pagos de gastos fijos registrados en este período.
              </div>
            ) : (
              stats.fixedBreakdown.map((item, idx) => {
                const totalFixed = stats.fixedBreakdown.reduce((acc, curr) => acc + curr.total, 0);
                const percent = totalFixed > 0 ? (item.total / totalFixed) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{item.subcategory_name || 'General'}</span>
                      <span className="text-white font-bold">
                        {settings.currency_symbol} {formatNum(item.total)}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({percent.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Daily Cash Movement Trend Graph */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-white">Evolución Diaria del Flujo Contable</h3>
            <p className="text-xs text-slate-400">
              Comparativa día a día: Ingresos cobrados (verde) vs Salidas pagadas (rojo)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-slate-300">Ingresos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500" />
              <span className="text-slate-300">Gastos</span>
            </div>
          </div>
        </div>

        {/* Bar Graph */}
        <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 border-b border-slate-800 overflow-x-auto">
          {stats.dailyTrend.map((d) => {
            const incHeight = maxDailyValue > 0 ? (d.income / maxDailyValue) * 100 : 0;
            const expHeight = maxDailyValue > 0 ? (d.expenses / maxDailyValue) * 100 : 0;
            const hasData = d.income > 0 || d.expenses > 0;

            return (
              <div
                key={d.day}
                className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-full group relative cursor-pointer"
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-950 border border-slate-700 text-white text-[10px] p-2 rounded-lg z-20 whitespace-nowrap shadow-xl pointer-events-none">
                  <span className="font-bold text-slate-300">Día {d.day}:</span>
                  <span className="text-emerald-400">
                    Ingreso: {settings.currency_symbol}{formatNum(d.income)}
                  </span>
                  <span className="text-rose-400">
                    Gasto: {settings.currency_symbol}{formatNum(d.expenses)}
                  </span>
                </div>

                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  <div
                    className="w-1.5 sm:w-2 bg-emerald-500 rounded-t transition-all group-hover:brightness-125"
                    style={{ height: `${Math.max(incHeight, hasData ? 3 : 0)}%` }}
                  />
                  <div
                    className="w-1.5 sm:w-2 bg-rose-500 rounded-t transition-all group-hover:brightness-125"
                    style={{ height: `${Math.max(expHeight, hasData ? 3 : 0)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-500 mt-1">{parseInt(d.day) % 3 === 1 ? d.day : ''}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribution by Category & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              <span>Distribución de Gastos</span>
            </h3>
            <span className="text-xs text-slate-400">Por concepto principal</span>
          </div>

          <div className="space-y-3">
            {stats.expensesByCategory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Sin movimientos registrados.
              </div>
            ) : (
              stats.expensesByCategory.map((c, idx) => {
                const percent = stats.totalExpenses > 0 ? (c.amount / stats.totalExpenses) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium truncate">{c.name}</span>
                      <span className="text-white font-bold shrink-0">
                        {settings.currency_symbol} {formatNum(c.amount)}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({percent.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Últimos Asientos Contables</span>
              </h3>
              <button
                onClick={onNavigateToLedger}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Libro Diario Completo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-3 rounded-l-lg">Fecha</th>
                    <th className="py-2 px-3">Concepto & Subcuenta</th>
                    <th className="py-2 px-3">Medio</th>
                    <th className="py-2 px-3 text-right rounded-r-lg">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats.recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        No hay transacciones recientes en este período.
                      </td>
                    </tr>
                  ) : (
                    stats.recentTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                          {t.date} <span className="text-[10px]">{t.time}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-white block">{t.category_name}</span>
                          <span className="text-[10px] text-slate-400">{t.subcategory_name || 'General'}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400 capitalize">
                          {t.payment_method.replace('_', ' ')}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                            t.type === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {t.type === 'ingreso' ? '+' : '-'} {settings.currency_symbol} {formatNum(t.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 mt-4">
            <span>¿Desea asentar un ingreso o egreso nuevo?</span>
            <button
              onClick={onOpenNewTransaction}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
            >
              + Agregar Asiento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatNum(num: number): string {
  return (num || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
