import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  FileText,
  FileSpreadsheet,
  Trash2,
  Edit,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  X,
  CreditCard,
  DollarSign,
  Download,
} from 'lucide-react';
import { Transaction, Category, BusinessSettings, User } from '../types';
import { api } from '../services/api';
import { exportService } from '../services/exportService';

interface LedgerProps {
  settings: BusinessSettings;
  categories: Category[];
  currentUser: User;
  onOpenNewTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const Ledger: React.FC<LedgerProps> = ({
  settings,
  categories,
  currentUser,
  onOpenNewTransaction,
  onEditTransaction,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ingreso' | 'egreso'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'this_month' | 'this_week' | 'today' | 'custom' | 'all'>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const calculateDatesForPreset = (preset: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (preset === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      return { start: todayStr, end: todayStr };
    }
    if (preset === 'this_week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      return {
        start: monday.toISOString().slice(0, 10),
        end: now.toISOString().slice(0, 10),
      };
    }
    if (preset === 'this_month') {
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      return { start, end };
    }
    return { start: '', end: '' };
  };

  useEffect(() => {
    if (datePreset !== 'custom') {
      const { start, end } = calculateDatesForPreset(datePreset);
      setStartDate(start);
      setEndDate(end);
    }
  }, [datePreset]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTransactions({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: typeFilter,
        categoryId: categoryFilter,
        paymentMethod: paymentMethodFilter,
        search: searchTerm || undefined,
      });
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener transacciones contables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [startDate, endDate, typeFilter, categoryFilter, paymentMethodFilter, searchTerm]);

  const handleDelete = async (tx: Transaction) => {
    if (
      !window.confirm(
        `¿Eliminar el asiento contable #${tx.id} de ${settings.currency_symbol} ${tx.amount} (${tx.category_name})?`
      )
    ) {
      return;
    }
    try {
      await api.deleteTransaction(tx.id);
      loadTransactions();
    } catch (err: any) {
      alert('Error al eliminar asiento: ' + err.message);
    }
  };

  // Totals calculations
  const totalIngresos = transactions
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalEgresos = transactions
    .filter((t) => t.type === 'egreso')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldoNeto = totalIngresos - totalEgresos;

  const handleExportPDF = () => {
    exportService.exportTransactionsToPDF(
      transactions,
      settings,
      datePreset === 'all' ? 'Histórico General' : `${startDate} al ${endDate}`
    );
  };

  const handleExportExcel = () => {
    exportService.exportTransactionsToExcel(
      transactions,
      settings,
      datePreset === 'all' ? 'Historico' : `${startDate}_al_${endDate}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Libro Diario de Cuentas</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Asientos Contables de Entradas y Salidas
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Registro cronológico auditado de todos los movimientos, compras de víveres, ventas y gastos.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Exportar registros filtrados a PDF con membrete oficial"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Exportar PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Exportar a planilla Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={onOpenNewTransaction}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Asiento</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Quick Date Range Preset */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
              Período
            </label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="this_month">Este Mes</option>
              <option value="this_week">Esta Semana</option>
              <option value="today">Hoy</option>
              <option value="all">Todo el Histórico</option>
              <option value="custom">Rango Personalizado</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
              Tipo Asiento
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Todos los movimientos</option>
              <option value="ingreso">(+) Solo Entradas / Ingresos</option>
              <option value="egreso">(-) Solo Salidas / Egresos</option>
            </select>
          </div>

          {/* Concept Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
              Concepto / Cuenta
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Todos los conceptos</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_fixed ? '[Fijo]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
              Método Pago
            </label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Todos los medios</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta_debito">Tarjeta Débito</option>
              <option value="tarjeta_credito">Tarjeta Crédito</option>
              <option value="transferencia">Transferencia</option>
              <option value="pago_movil_zelle">Pago Móvil / Zelle</option>
            </select>
          </div>

          {/* Search box */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
              Buscar texto
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Factura, nota, insumo..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            </div>
          </div>
        </div>

        {/* Custom Date Range if active */}
        {datePreset === 'custom' && (
          <div className="mt-3 flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <span className="text-xs text-slate-400">Rango:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
            />
            <span className="text-xs text-slate-400">hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
            />
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Concepto Principal</th>
                <th className="py-3 px-4">Subconcepto / Cuenta</th>
                <th className="py-3 px-4">Comprobante</th>
                <th className="py-3 px-4">Medio de Pago</th>
                <th className="py-3 px-4 text-right">Monto Total</th>
                <th className="py-3 px-4">Detalle / Notas</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Cargando asientos contables...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No se encontraron asientos contables con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">#{t.id}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-white block">{t.date}</span>
                      <span className="text-[10px] text-slate-400">{t.time}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {t.type === 'ingreso' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                          <ArrowDownLeft className="w-3 h-3" />
                          Entrada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 font-bold text-[10px] border border-rose-500/30">
                          <ArrowUpRight className="w-3 h-3" />
                          Salida
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{t.category_name}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {t.subcategory_name ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-medium border border-slate-700/60">
                          {t.subcategory_name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">General</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {t.reference_number || '-'}
                    </td>
                    <td className="py-3 px-4 capitalize text-[11px] text-slate-300">
                      {t.payment_method.replace(/_/g, ' ')}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold whitespace-nowrap text-sm ${
                        t.type === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {t.type === 'ingreso' ? '+' : '-'} {settings.currency_symbol}{' '}
                      {formatNum(t.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={t.description}>
                      {t.description || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEditTransaction(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar Asiento"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Eliminar Asiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Bottom Totals Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
          <div className="text-slate-400">
            Mostrando <strong className="text-white">{transactions.length}</strong> asientos contables
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Total Entradas:</span>
              <span className="font-bold text-emerald-400 text-sm">
                +{settings.currency_symbol} {formatNum(totalIngresos)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Total Salidas:</span>
              <span className="font-bold text-rose-400 text-sm">
                -{settings.currency_symbol} {formatNum(totalEgresos)}
              </span>
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-slate-800">
              <span className="text-slate-300 font-semibold">Saldo Neto:</span>
              <span
                className={`font-extrabold text-sm ${
                  saldoNeto >= 0 ? 'text-blue-400' : 'text-rose-400'
                }`}
              >
                {settings.currency_symbol} {formatNum(saldoNeto)}
              </span>
            </div>
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
