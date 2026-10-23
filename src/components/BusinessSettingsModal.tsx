import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  Save,
  Check,
  AlertCircle,
  Database,
  Download,
  Trash2,
  Lock,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { BusinessSettings } from '../types';
import { api } from '../services/api';

interface BusinessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  onSettingsUpdated: (newSettings: BusinessSettings) => void;
  onDataReset?: () => void;
}

export const BusinessSettingsModal: React.FC<BusinessSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsUpdated,
  onDataReset,
}) => {
  const [formData, setFormData] = useState<BusinessSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Database Wipe / Reset state
  const [showWipePanel, setShowWipePanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [wipeMode, setWipeMode] = useState<'transactions_only' | 'all'>('transactions_only');
  const [wiping, setWiping] = useState(false);
  const [wipeError, setWipeError] = useState<string | null>(null);
  const [wipeSuccess, setWipeSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFormData(settings);
    setShowWipePanel(false);
    setAdminPassword('');
    setWipeError(null);
    setWipeSuccess(null);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      await api.updateSettings(formData);
      onSettingsUpdated(formData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/export/backup-sqlite';
  };

  const handleExecuteWipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setWipeError('Debe ingresar la contraseña de Administrador para confirmar.');
      return;
    }

    const confirmMsg =
      wipeMode === 'transactions_only'
        ? '¿CONFIRMA que desea eliminar TODOS los asientos del libro diario y cierres de caja? Esta acción dejará los datos operativos en blanco.'
        : '¿CONFIRMA el restablecimiento total a blanco de toda la base de datos?';

    if (!window.confirm(confirmMsg)) return;

    try {
      setWiping(true);
      setWipeError(null);
      const res = await api.resetDatabase(adminPassword.trim(), wipeMode);
      setWipeSuccess(res.message);
      setAdminPassword('');
      if (onDataReset) onDataReset();
      setTimeout(() => {
        setWipeSuccess(null);
        setShowWipePanel(false);
      }, 2500);
    } catch (err: any) {
      setWipeError(err.message || 'Error al limpiar la base de datos');
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl text-slate-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configuración del Establecimiento</h3>
              <p className="text-xs text-slate-400">
                Datos fiscales, moneda, base de datos SQLite y mantenimiento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Configuración guardada exitosamente</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                Nombre del Negocio / Restaurante *
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                Identificación Fiscal (Rif / NIT / RFC / CIF)
              </label>
              <input
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                Símbolo Moneda *
              </label>
              <input
                type="text"
                value={formData.currency_symbol}
                onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                placeholder="$, €, Bs, S/."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                Código Moneda
              </label>
              <input
                type="text"
                value={formData.currency_code}
                onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                placeholder="USD, EUR, VES, MXN"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                Fondo Base de Caja
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.initial_cash_fund}
                onChange={(e) =>
                  setFormData({ ...formData, initial_cash_fund: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
                Régimen Fiscal
              </label>
              <input
                type="text"
                value={formData.fiscal_regime}
                onChange={(e) => setFormData({ ...formData, fiscal_regime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase">
              Dirección Comercial
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* SQLite Backup Section */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  Copia de Seguridad SQLite (.sqlite)
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Descargue el archivo íntegro de base de datos antes de cualquier cambio importante
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .sqlite</span>
            </button>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* ZONA DE SEGURIDAD / LIMPIAR BASE DE DATOS (SOLO CON CLAVE ADMIN) */}
          {/* ------------------------------------------------------------------ */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Mantenimiento: Limpiar Base de Datos
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowWipePanel(!showWipePanel);
                  setWipeError(null);
                  setWipeSuccess(null);
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 underline font-semibold cursor-pointer"
              >
                {showWipePanel ? 'Ocultar panel' : 'Restablecer / Dejar en blanco'}
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Permite reiniciar los datos de prueba u operaciones diarias acumuladas para comenzar de cero.
              <strong> Requiere la contraseña del Administrador.</strong>
            </p>

            {showWipePanel && (
              <div className="pt-3 border-t border-rose-900/40 space-y-3 animate-in fade-in">
                {wipeError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{wipeError}</span>
                  </div>
                )}

                {wipeSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{wipeSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Tipo de Limpieza:
                  </label>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="wipeMode"
                        checked={wipeMode === 'transactions_only'}
                        onChange={() => setWipeMode('transactions_only')}
                        className="mt-0.5 text-rose-500 focus:ring-rose-400"
                      />
                      <div>
                        <strong className="block text-white">Dejar datos operativos en blanco (Recomendado)</strong>
                        <span className="text-[10px] text-slate-400">
                          Elimina todos los asientos del Libro Diario y los Cierres de Caja. Conserva intactos todos los conceptos y subconceptos (víveres, gastos fijos, etc.).
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="wipeMode"
                        checked={wipeMode === 'all'}
                        onChange={() => setWipeMode('all')}
                        className="mt-0.5 text-rose-500 focus:ring-rose-400"
                      />
                      <div>
                        <strong className="block text-white">Limpieza total absoluta</strong>
                        <span className="text-[10px] text-slate-400">
                          Elimina asientos, cierres y también los conceptos/subconceptos para volver a crearlos desde cero.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-rose-300 mb-1 uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    Ingrese Contraseña de Administrador para Autorizar *
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Contraseña del usuario Administrador"
                    className="w-full px-3 py-2 bg-slate-950 border border-rose-800/80 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Descargar respaldo antes de limpiar</span>
                  </button>

                  <button
                    type="button"
                    disabled={wiping || !adminPassword.trim()}
                    onClick={handleExecuteWipe}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-rose-600/30 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{wiping ? 'Limpiando...' : 'Confirmar y Limpiar Datos'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Cambios de Configuración'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
