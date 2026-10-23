import React, { useState } from 'react';
import {
  Tags,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Building2,
  Apple,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { Category, Subcategory } from '../types';
import { api } from '../services/api';

interface ConceptSettingsProps {
  categories: Category[];
  onReloadCategories: () => void;
}

export const ConceptSettings: React.FC<ConceptSettingsProps> = ({
  categories,
  onReloadCategories,
}) => {
  const [activeTab, setActiveTab] = useState<'egreso' | 'ingreso'>('egreso');
  const [filterFixed, setFilterFixed] = useState<'all' | 'fixed' | 'variable'>('all');
  const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    5: true,
    6: true,
    7: true,
  });

  // Modal states for Category
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catType, setCatType] = useState<'ingreso' | 'egreso'>('egreso');
  const [catIsFixed, setCatIsFixed] = useState(false);
  const [catDesc, setCatDesc] = useState('');
  const [catColor, setCatColor] = useState('#ef4444');

  // Modal states for Subcategory
  const [showSubModal, setShowSubModal] = useState(false);
  const [targetCategoryForSub, setTargetCategoryForSub] = useState<Category | null>(null);
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [subName, setSubName] = useState('');
  const [subDesc, setSubDesc] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const notify = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // -------------------------------------------------------------
  // Category Modal Handlers
  // -------------------------------------------------------------
  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatCode('');
    setCatType(activeTab);
    setCatIsFixed(false);
    setCatDesc('');
    setCatColor(activeTab === 'egreso' ? '#ef4444' : '#10b981');
    setError(null);
    setShowCatModal(true);
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatCode(cat.code);
    setCatType(cat.type);
    setCatIsFixed(cat.is_fixed);
    setCatDesc(cat.description || '');
    setCatColor(cat.color || '#3b82f6');
    setError(null);
    setShowCatModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setError('El nombre del concepto es obligatorio');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: catName.trim(),
        code: catCode.trim(),
        type: catType,
        is_fixed: catIsFixed,
        description: catDesc.trim(),
        color: catColor,
      };

      if (editingCategory) {
        await api.updateCategory(editingCategory.id, payload);
        notify('Concepto contable actualizado');
      } else {
        await api.createCategory(payload);
        notify('Nuevo concepto contable creado');
      }

      await onReloadCategories();
      setShowCatModal(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar concepto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (
      !window.confirm(
        `¿Eliminar el concepto "${cat.name}" y todos sus subconceptos asociados? No se podrá eliminar si tiene asientos registrados.`
      )
    ) {
      return;
    }
    try {
      setError(null);
      await api.deleteCategory(cat.id);
      notify('Concepto eliminado');
      await onReloadCategories();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar el concepto');
    }
  };

  // -------------------------------------------------------------
  // Subcategory Modal Handlers
  // -------------------------------------------------------------
  const openNewSubModal = (cat: Category) => {
    setTargetCategoryForSub(cat);
    setEditingSub(null);
    setSubName('');
    setSubDesc('');
    setError(null);
    setShowSubModal(true);
  };

  const openEditSubModal = (cat: Category, sub: Subcategory) => {
    setTargetCategoryForSub(cat);
    setEditingSub(sub);
    setSubName(sub.name);
    setSubDesc(sub.description || '');
    setError(null);
    setShowSubModal(true);
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !targetCategoryForSub) {
      setError('El nombre del subconcepto es obligatorio');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (editingSub) {
        await api.updateSubcategory(editingSub.id, {
          name: subName.trim(),
          description: subDesc.trim(),
        });
        notify('Subconcepto actualizado');
      } else {
        await api.createSubcategory({
          category_id: targetCategoryForSub.id,
          name: subName.trim(),
          description: subDesc.trim(),
        });
        notify(`Subconcepto agregado a ${targetCategoryForSub.name}`);
      }

      await onReloadCategories();
      // Ensure target is expanded
      setExpandedCats((prev) => ({ ...prev, [targetCategoryForSub.id]: true }));
      setShowSubModal(false);
    } catch (err: any) {
      setError(err.message || 'Error al guardar subconcepto');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubcategory = async (sub: Subcategory) => {
    if (!window.confirm(`¿Eliminar el subconcepto "${sub.name}"?`)) return;
    try {
      setError(null);
      await api.deleteSubcategory(sub.id);
      notify('Subconcepto eliminado');
      await onReloadCategories();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar subconcepto');
    }
  };

  // Filter categories
  const filteredCategories = categories.filter((cat) => {
    if (cat.type !== activeTab) return false;
    if (activeTab === 'egreso') {
      if (filterFixed === 'fixed') return cat.is_fixed;
      if (filterFixed === 'variable') return !cat.is_fixed;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Tags className="w-4 h-4" />
              <span>Plan de Cuentas y Conceptos</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Configuración de Conceptos y Subconceptos
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Personalice las categorías contables (Víveres, Gastos Fijos, Impuestos, etc.) y sus
              subcuentas visibles al registrar entradas y salidas.
            </p>
          </div>

          <button
            onClick={openNewCategoryModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Nuevo Concepto</span>
          </button>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Main Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('egreso')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'egreso'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Egresos / Gastos ({categories.filter((c) => c.type === 'egreso').length})
          </button>
          <button
            onClick={() => setActiveTab('ingreso')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ingreso'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ingresos / Entradas ({categories.filter((c) => c.type === 'ingreso').length})
          </button>
        </div>

        {/* Sub-filter for Expenses */}
        {activeTab === 'egreso' && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-[11px] font-medium mr-1">Filtrar:</span>
            <button
              onClick={() => setFilterFixed('all')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                filterFixed === 'all'
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterFixed('fixed')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                filterFixed === 'fixed'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Gastos Fijos (Alquiler, Luz, Gas...)
            </button>
            <button
              onClick={() => setFilterFixed('variable')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                filterFixed === 'variable'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              Gastos Variables (Víveres, Insumos)
            </button>
          </div>
        )}
      </div>

      {/* Categories & Subcategories Tree List */}
      <div className="space-y-3">
        {filteredCategories.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            <p className="text-sm">No hay conceptos registrados con este filtro.</p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const isExpanded = !!expandedCats[cat.id];
            const subCount = cat.subcategories.length;

            return (
              <div
                key={cat.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all shadow-sm hover:border-slate-750"
              >
                {/* Concept Main Bar */}
                <div className="p-4 sm:px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-850/60">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(cat.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: cat.color || '#3b82f6' }}
                    />

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm sm:text-base">{cat.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-800">
                          {cat.code}
                        </span>
                        {cat.is_fixed && (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            Gasto Fijo
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for this Concept */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs text-slate-400 mr-1 hidden sm:inline">
                      {subCount} {subCount === 1 ? 'subconcepto' : 'subconceptos'}
                    </span>

                    <button
                      onClick={() => openNewSubModal(cat)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Agregar subconcepto a este grupo"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Subconcepto</span>
                    </button>

                    <button
                      onClick={() => openEditCategoryModal(cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Editar Concepto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Eliminar Concepto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subconcepts Section (Accordion) */}
                {isExpanded && (
                  <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/40">
                    {cat.subcategories.length === 0 ? (
                      <div className="py-3 text-center text-xs text-slate-500">
                        No hay subconceptos definidos aún para este grupo.{' '}
                        <button
                          onClick={() => openNewSubModal(cat)}
                          className="text-emerald-400 underline hover:text-emerald-300 ml-1 cursor-pointer"
                        >
                          Agregar el primero
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 py-1">
                        {cat.subcategories.map((sub) => (
                          <div
                            key={sub.id}
                            className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2 group hover:border-slate-700 transition-colors"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-slate-200 block truncate">
                                {sub.name}
                              </span>
                              {sub.description && (
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {sub.description}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                              <button
                                onClick={() => openEditSubModal(cat, sub)}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteSubcategory(sub)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Category Modal (Create / Edit Concept) */}
      {/* ------------------------------------------------------------- */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingCategory ? 'Editar Concepto' : 'Nuevo Concepto Contable'}
              </h3>
              <button
                onClick={() => setShowCatModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Tipo de Cuenta *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCatType('egreso');
                      setCatColor('#ef4444');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      catType === 'egreso'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    Egreso / Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCatType('ingreso');
                      setCatColor('#10b981');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      catType === 'ingreso'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    Ingreso / Entrada
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nombre del Concepto *
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="ej. Víveres e Insumos, Gastos Fijos, Impuestos..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Código Contable
                  </label>
                  <input
                    type="text"
                    value={catCode}
                    onChange={(e) => setCatCode(e.target.value)}
                    placeholder="ej. GAS-VIV, GAS-FIJ"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Color Distintivo
                  </label>
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-700 rounded-xl p-1 cursor-pointer"
                  />
                </div>
              </div>

              {catType === 'egreso' && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="is_fixed_check"
                    checked={catIsFixed}
                    onChange={(e) => setCatIsFixed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                  <label htmlFor="is_fixed_check" className="text-xs text-slate-300 cursor-pointer">
                    <span className="font-semibold block text-white">Marcar como Gasto Fijo</span>
                    <span>
                      Aplica para obligaciones mensuales fijas: alquiler, electricidad, agua, gas,
                      teléfono, seguros, etc.
                    </span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Detalles sobre qué compras o movimientos pertenecen a este grupo..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Guardando...' : editingCategory ? 'Actualizar' : 'Guardar Concepto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Subcategory Modal (Create / Edit Subconcept) */}
      {/* ------------------------------------------------------------- */}
      {showSubModal && targetCategoryForSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingSub ? 'Editar Subconcepto' : 'Nuevo Subconcepto'}
                </h3>
                <p className="text-xs text-slate-400">
                  Grupo padre: <strong className="text-emerald-400">{targetCategoryForSub.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowSubModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubcategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nombre del Subconcepto *
                </label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="ej. Harina, Aceite, Charcutería, Alquiler, Luz, Gas..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Descripción o Ejemplos
                </label>
                <textarea
                  rows={2}
                  value={subDesc}
                  onChange={(e) => setSubDesc(e.target.value)}
                  placeholder="ej. Proveedores específicos, marcas habituales, especificaciones..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Guardando...' : editingSub ? 'Actualizar' : 'Agregar Subconcepto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
