import React, { useState, useEffect } from 'react';
import {
  Lock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  History,
  ShieldCheck,
  CreditCard,
  Building,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { CashClosure, BusinessSettings, User } from '../types';
import { api } from '../services/api';
import { exportService } from '../services/exportService';

interface CashClosureProps {
  settings: BusinessSettings;
  currentUser: User;
}

export const CashClosureComponent: React.FC<CashClosureProps> = ({ settings, currentUser }) => {
  const currentDate = new Date();
  const isCajero = currentUser.role === 'cajero';
  const [periodType, setPeriodType] = useState<'mensual' | 'diario'>(isCajero ? 'diario' : 'mensual');
  const [activeTab, setActiveTab] = useState<'new_closure' | 'history'>('new_closure');

  // Dates for new closure
  const [startDate, setStartDate] = useState<string>(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    if (isCajero) return currentDate.toISOString().slice(0, 10);
    return new Date(y, m, 1).toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    if (isCajero) return currentDate.toISOString().slice(0, 10);
    return new Date(y, m + 1, 0).toISOString().slice(0, 10);
  });
  const [periodLabel, setPeriodLabel] = useState<string>(
    isCajero
      ? `Jornada ${currentDate.toISOString().slice(0, 10)}`
      : `Octubre ${currentDate.getFullYear()}`
  );

  // Cash count input
  const [countedCash, setCountedCash] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live computed period metrics
  const [periodIncome, setPeriodIncome] = useState(0);
  const [periodExpenses, setPeriodExpenses] = useState(0);
  const [cashCollected, setCashCollected] = useState(0);
  const [cashPaidOut, setCashPaidOut] = useState(0);
  const [cardIncome, setCardIncome] = useState(0);
  const [transferIncome, setTransferIncome] = useState(0);

  // Closures history
  const [pastClosures, setPastClosures] = useState<CashClosure[]>([]);

  // When period type toggles, adjust dates and labels
  const handlePeriodTypeChange = (type: 'mensual' | 'diario') => {
    setPeriodType(type);
    const now = new Date();
    if (type === 'diario') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
      setPeriodLabel(`Jornada ${todayStr}`);
    } else {
      const y = now.getFullYear();
      const m = now.getMonth();
      setStartDate(new Date(y, m, 1).toISOString().slice(0, 10));
      setEndDate(new Date(y, m + 1, 0).toISOString().slice(0, 10));
      setPeriodLabel(
        `${now.toLocaleString('es-ES', { month: 'long' })} ${now.getFullYear()}`
      );
    }
  };

  const calculatePeriodFinancials = async () => {
    try {
      setLoadingCalc(true);
      setError(null);
      const txs = await api.getTransactions({
        startDate,
        endDate,
      });

      let inc = 0;
      let exp = 0;
      let cInc = 0;
      let cExp = 0;
      let cardInc = 0;
      let trfInc = 0;

      for (const t of txs) {
        const amt = Number(t.amount);
        if (t.type === 'ingreso') {
          inc += amt;
          if (t.payment_method === 'efectivo') cInc += amt;
          else if (t.payment_method === 'tarjeta_debito' || t.payment_method === 'tarjeta_credito') {
            cardInc += amt;
          } else {
            trfInc += amt;
          }
        } else {
          exp += amt;
          if (t.payment_method === 'efectivo') cExp += amt;
        }
      }

      setPeriodIncome(inc);
      setPeriodExpenses(exp);
      setCashCollected(cInc);
      setCashPaidOut(cExp);
      setCardIncome(cardInc);
      setTransferIncome(trfInc);

      // Pre-fill expected cash if counted is empty
      const initialFund = settings.initial_cash_fund || 0;
      const expected = initialFund + cInc - cExp;
      if (!countedCash) {
        setCountedCash(String(expected > 0 ? expected.toFixed(2) : '0.00'));
      }
    } catch (err: any) {
      setError('Error al calcular totales del período: ' + err.message);
    } finally {
      setLoadingCalc(false);
    }
  };

  const loadPastClosures = async () => {
    try {
      const data = await api.getClosures();
      setPastClosures(data);
    } catch (err: any) {
      console.error('Error fetching closures history:', err);
    }
  };

  useEffect(() => {
    calculatePeriodFinancials();
    loadPastClosures();
  }, [startDate, endDate]);

  const initialFund = settings.initial_cash_fund || 0;
  const expectedCash = initialFund + cashCollected - cashPaidOut;
  const parsedCountedCash = parseFloat(countedCash) || 0;
  const cashDifference = parsedCountedCash - expectedCash;
  const netBalance = periodIncome - periodExpenses;

  const handleSealClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodLabel.trim()) {
      setError('Especifique una etiqueta para el período de cierre');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await api.createClosure({
        period_type: periodType,
        period_label: periodLabel.trim(),
        start_date: startDate,
        end_date: endDate,
        total_income: periodIncome,
        total_expenses: periodExpenses,
        net_balance: netBalance,
        expected_cash: expectedCash,
        counted_cash: parsedCountedCash,
        cash_difference: cashDifference,
        closed_by_user: currentUser.name,
        notes: notes.trim(),
      });

      setSuccessMsg('¡Cierre de caja registrado y sellado con éxito!');
      await loadPastClosures();
      setActiveTab('history');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error al sellar cierre de caja');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Lock className="w-4 h-4" />
              <span>Conciliación & Arqueo</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Cierre de Caja Contable (Diario y Mensual)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Verifique el dinero físico contra las entradas y salidas registradas en el sistema.
            </p>
          </div>

          {/* Tab Switcher: Nuevo Cierre vs Historial */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('new_closure')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'new_closure'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Nuevo Cierre / Arqueo
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Histórico Sellado ({pastClosures.length})
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {activeTab === 'new_closure' ? (
        <form onSubmit={handleSealClosure} className="space-y-6">
          {/* Period Configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>1. Configurar Período a Auditar</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Tipo de Cierre
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                  {!isCajero ? (
                    <button
                      type="button"
                      onClick={() => handlePeriodTypeChange('mensual')}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        periodType === 'mensual'
                          ? 'bg-slate-800 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Mensual
                    </button>
                  ) : (
                    <div
                      title="El Cierre Mensual está reservado para Contaduría y Gerencia"
                      className="py-1.5 px-2 rounded-lg text-[10px] text-slate-600 bg-slate-900/50 flex items-center justify-center font-medium cursor-not-allowed"
                    >
                      Mensual (Bloqueado)
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePeriodTypeChange('diario')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      periodType === 'diario'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Diario / Turno
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Etiqueta del Período *
                </label>
                <input
                  type="text"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  placeholder="ej. Octubre 2026 o Jornada 23-10-2026"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* System Computation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contabilidad Global */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Resultado Contable del Período
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Ingresos:</span>
                  <span className="text-emerald-400 font-bold">
                    +{settings.currency_symbol} {formatNum(periodIncome)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Gastos:</span>
                  <span className="text-rose-400 font-bold">
                    -{settings.currency_symbol} {formatNum(periodExpenses)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm">
                  <span className="text-white">Utilidad Neta:</span>
                  <span className={netBalance >= 0 ? 'text-blue-400' : 'text-rose-400'}>
                    {settings.currency_symbol} {formatNum(netBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ingresos por Medio */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Ingresos por Medio de Cobro
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-amber-400" />
                    Efectivo:
                  </span>
                  <span className="text-white font-semibold">
                    {settings.currency_symbol} {formatNum(cashCollected)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    Tarjetas (POS):
                  </span>
                  <span className="text-white font-semibold">
                    {settings.currency_symbol} {formatNum(cardIncome)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-purple-400" />
                    Transf. / Zelle:
                  </span>
                  <span className="text-white font-semibold">
                    {settings.currency_symbol} {formatNum(transferIncome)}
                  </span>
                </div>
              </div>
            </div>

            {/* Efectivo Teórico Esperado */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 bg-gradient-to-br from-slate-900 to-slate-850">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Efectivo Físico Esperado en Caja
              </span>
              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>(+) Fondo base inicial:</span>
                  <span className="text-white">
                    {settings.currency_symbol} {formatNum(initialFund)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>(+) Cobros en efectivo:</span>
                  <span className="text-emerald-400">
                    +{settings.currency_symbol} {formatNum(cashCollected)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>(-) Pagos en efectivo:</span>
                  <span className="text-rose-400">
                    -{settings.currency_symbol} {formatNum(cashPaidOut)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-extrabold text-sm text-white">
                  <span>Debe haber en caja:</span>
                  <span className="text-amber-400">
                    {settings.currency_symbol} {formatNum(expectedCash)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Arqueo Físico y Conciliación */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span>2. Conteo Real de Efectivo y Diferencia</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Monto Físico Contado en Caja ({settings.currency_symbol}) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400 font-bold text-sm">
                    {settings.currency_symbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Ingrese la suma de todos los billetes y monedas presentes físicamente en la gaveta.
                </p>
              </div>

              {/* Status difference badge */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Resultado del Arqueo
                </span>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-black">
                      {cashDifference === 0 ? (
                        <span className="text-emerald-400">CUADRADO EXACTO</span>
                      ) : cashDifference > 0 ? (
                        <span className="text-amber-400">
                          SOBRANTE: +{settings.currency_symbol} {formatNum(cashDifference)}
                        </span>
                      ) : (
                        <span className="text-rose-400">
                          FALTANTE: {settings.currency_symbol} {formatNum(cashDifference)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Diferencia = Contado ({settings.currency_symbol}{formatNum(parsedCountedCash)}) -
                      Esperado ({settings.currency_symbol}{formatNum(expectedCash)})
                    </div>
                  </div>

                  <div className="p-3 rounded-full bg-slate-900 border border-slate-800">
                    {cashDifference === 0 ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    ) : cashDifference > 0 ? (
                      <CheckCircle2 className="w-8 h-8 text-amber-400" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-rose-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Observaciones del Arqueo / Cierre
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indique justificación de diferencias, novedades de la jornada o entrega de sobre de depósito..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{submitting ? 'Sellando Cierre...' : 'Sellar y Guardar Cierre Contable'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* History of Sealed Closures */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Historial de Cierres de Caja Sellados</span>
              </h3>
              <p className="text-xs text-slate-400">
                Libro de actas auditadas y descargables en formato PDF oficial
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Período</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Fechas</th>
                  <th className="py-3 px-4 text-right">Ingresos</th>
                  <th className="py-3 px-4 text-right">Egresos</th>
                  <th className="py-3 px-4 text-right">Saldo Neto</th>
                  <th className="py-3 px-4 text-right">Dif. Caja</th>
                  <th className="py-3 px-4">Cerrado Por</th>
                  <th className="py-3 px-4 text-center">Acta PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pastClosures.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">
                      No hay cierres registrados en el historial aún.
                    </td>
                  </tr>
                ) : (
                  pastClosures.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">#{c.id}</td>
                      <td className="py-3 px-4 font-bold text-white">{c.period_label}</td>
                      <td className="py-3 px-4 capitalize">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-semibold border border-slate-700">
                          {c.period_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {c.start_date} al {c.end_date}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                        +{settings.currency_symbol} {formatNum(c.total_income)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-400">
                        -{settings.currency_symbol} {formatNum(c.total_expenses)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-white">
                        {settings.currency_symbol} {formatNum(c.net_balance)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {c.cash_difference === 0 ? (
                          <span className="text-emerald-400">0.00</span>
                        ) : c.cash_difference > 0 ? (
                          <span className="text-amber-400">
                            +{settings.currency_symbol}{formatNum(c.cash_difference)}
                          </span>
                        ) : (
                          <span className="text-rose-400">
                            {settings.currency_symbol}{formatNum(c.cash_difference)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{c.closed_by_user}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => exportService.exportClosureCertificateToPDF(c, settings)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 font-semibold text-[11px] inline-flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                          title="Descargar Acta Formal de Cierre en PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

function formatNum(num: number): string {
  return (num || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
