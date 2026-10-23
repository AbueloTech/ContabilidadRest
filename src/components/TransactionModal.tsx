import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  DollarSign,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Tag,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import { Category, Transaction, PaymentMethod, User, BusinessSettings } from '../types';
import { api } from '../services/api';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: Category[];
  onReloadCategories: () => void;
  editingTransaction?: Transaction | null;
  currentUser: User;
  settings: BusinessSettings;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
  onReloadCategories,
  editingTransaction,
  currentUser,
  settings,
}) => {
  const [type, setType] = useState<'ingreso' | 'egreso'>('egreso');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [subcategoryId, setSubcategoryId] = useState<number | ''>('');
  const [amount, setAmount] = useState<string>('');
  const [taxAmount, setTaxAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(new Date().toTimeString().slice(0, 5));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New quick subconcept inline state
  const [showNewSubForm, setShowNewSubForm] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [creatingSub, setCreatingSub] = useState(false);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setCategoryId(editingTransaction.category_id);
      setSubcategoryId(editingTransaction.subcategory_id || '');
      setAmount(String(editingTransaction.amount));
      setTaxAmount(String(editingTransaction.tax_amount || ''));
      setPaymentMethod(editingTransaction.payment_method);
      setReferenceNumber(editingTransaction.reference_number || '');
      setDescription(editingTransaction.description || '');
      setDate(editingTransaction.date);
      setTime(editingTransaction.time || new Date().toTimeString().slice(0, 5));
    } else {
      resetForm();
    }
  }, [editingTransaction, isOpen]);

  const resetForm = () => {
    setType('egreso');
    const firstCat = categories.find((c) => c.type === 'egreso');
    setCategoryId(firstCat ? firstCat.id : '');
    setSubcategoryId('');
    setAmount('');
    setTaxAmount('');
    setPaymentMethod('efectivo');
    setReferenceNumber('');
    setDescription('');
    setDate(new Date().toISOString().slice(0, 10));
    setTime(new Date().toTimeString().slice(0, 5));
    setError(null);
    setShowNewSubForm(false);
    setNewSubName('');
  };

  const filteredCategories = categories.filter((c) => c.type === type);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subcategories = selectedCategory ? selectedCategory.subcategories : [];

  // When type changes, adjust selected category if needed
  const handleTypeChange = (newType: 'ingreso' | 'egreso') => {
    setType(newType);
    const available = categories.filter((c) => c.type === newType);
    if (available.length > 0) {
      setCategoryId(available[0].id);
      setSubcategoryId('');
    } else {
      setCategoryId('');
      setSubcategoryId('');
    }
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !categoryId) return;
    try {
      setCreatingSub(true);
      await api.createSubcategory({
        category_id: Number(categoryId),
        name: newSubName.trim(),
      });
      await onReloadCategories();
      setNewSubName('');
      setShowNewSubForm(false);
    } catch (err: any) {
      setError(err.message || 'Error al crear subconcepto');
    } finally {
      setCreatingSub(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount || parseFloat(amount) <= 0) {
      setError('Por favor complete los campos obligatorios y un monto válido.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        date,
        time,
        type,
        category_id: Number(categoryId),
        subcategory_id: subcategoryId ? Number(subcategoryId) : null,
        amount: parseFloat(amount),
        tax_amount: taxAmount ? parseFloat(taxAmount) : 0,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim(),
        description: description.trim(),
        user_id: currentUser.id,
        user_name: currentUser.name,
      };

      if (editingTransaction) {
        await api.updateTransaction(editingTransaction.id, payload);
      } else {
        await api.createTransaction(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el asiento contable');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl text-slate-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              {editingTransaction ? 'Editar Asiento Contable' : 'Nuevo Asiento Contable'}
            </h3>
            <p className="text-xs text-slate-400">
              Registro para el Libro Diario y Cuentas de Restaurante
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo Selector: Ingreso vs Egreso */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Tipo de Movimiento
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('ingreso')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'ingreso'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>(+) Entrada / Ingreso</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('egreso')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'egreso'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>(-) Salida / Gasto</span>
              </button>
            </div>
          </div>

          {/* Monto & Impuesto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Monto Total ({settings.currency_symbol}) *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <span className="font-bold text-sm text-emerald-400">{settings.currency_symbol}</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Impuestos Incluidos ({settings.currency_symbol})
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="text-xs text-slate-400">%</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  placeholder="0.00 (Opcional)"
                  className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Concepto Principal (Categoría) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Concepto Principal ({type === 'ingreso' ? 'Ingreso' : 'Gasto'}) *
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(Number(e.target.value));
                setSubcategoryId('');
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm cursor-pointer"
              required
            >
              <option value="" disabled>
                Seleccionar concepto...
              </option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_fixed ? '— [Gasto Fijo]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Subconcepto (Víveres: Harina, Aceite, etc. / Fijos: Alquiler, Luz, Agua) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Subconcepto / Detalle de Cuenta
              </label>
              {categoryId && (
                <button
                  type="button"
                  onClick={() => setShowNewSubForm(!showNewSubForm)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{showNewSubForm ? 'Cerrar' : '+ Crear Subconcepto'}</span>
                </button>
              )}
            </div>

            {showNewSubForm && (
              <div className="mb-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-2">
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="ej. Harina, Aceite, Charcutería, Gas..."
                  className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <button
                  type="button"
                  disabled={creatingSub || !newSubName.trim()}
                  onClick={handleCreateSubcategory}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {creatingSub ? '...' : 'Guardar'}
                </button>
              </div>
            )}

            <select
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm cursor-pointer"
            >
              <option value="">(Sin subconcepto / General)</option>
              {subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Método de Pago & Factura/Comprobante */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Método de Pago *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm cursor-pointer"
                required
              >
                <option value="efectivo">💵 Efectivo (Caja Física)</option>
                <option value="tarjeta_debito">💳 Tarjeta Débito</option>
                <option value="tarjeta_credito">💳 Tarjeta Crédito</option>
                <option value="transferencia">🏦 Transferencia Bancaria</option>
                <option value="pago_movil_zelle">📱 Pago Móvil / Zelle</option>
                <option value="otro">📄 Otro Medio</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                N° Factura / Comprobante
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="ej. FAC-0012, TCK-89"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          {/* Fecha & Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Fecha *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Hora
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          {/* Descripción / Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Detalle / Observaciones
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalle de la compra, proveedor, mesa o concepto específico..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Guardando...' : editingTransaction ? 'Actualizar Asiento' : 'Registrar en Libro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
