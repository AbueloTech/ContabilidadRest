import React from 'react';
import {
  Utensils,
  BookOpen,
  ShieldCheck,
  Database,
  ArrowRight,
  DollarSign,
  Users,
  Lock,
  Calculator,
  Briefcase,
  Layers,
} from 'lucide-react';
import { BusinessSettings } from '../types';

interface SplashProps {
  onStart: () => void;
  settings?: BusinessSettings;
}

export const Splash: React.FC<SplashProps> = ({ onStart, settings }) => {
  const businessName = settings?.business_name || 'Restaurant Terreno Broaster';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col items-center justify-center p-4 sm:p-6 text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full text-center relative z-10 py-8">
        {/* Animated Brand Badge */}
        <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 to-emerald-400 shadow-2xl shadow-emerald-500/30 mb-6 ring-4 ring-emerald-500/20 animate-in zoom-in duration-500">
          <Utensils className="w-10 h-10 sm:w-12 sm:h-12 text-slate-950" />
        </div>

        <div className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
          Sistema Contable & Control de Caja para Restaurantes
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-2">
          {businessName}
        </h1>
        <p className="text-base sm:text-lg text-emerald-400 font-semibold mb-3">
          Sabor & Cuentas • Gestión de Entradas y Salidas
        </p>

        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mb-8 leading-relaxed">
          Plataforma contable con base de datos <strong>SQLite</strong> en servidor: control detallado de víveres (harina, aceite, charcutería, verduras), gastos fijos (alquiler, luz, agua, gas), impuestos, libro diario y arqueos de caja con control de acceso por roles.
        </p>

        {/* 3 User Roles Guide */}
        <div className="mb-8 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-left backdrop-blur-md">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3 text-center sm:text-left">
            Perfiles de Acceso Segregados por Rol:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-400">1. Administrador</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  Acceso total: gestión de usuarios, finanzas, plan de cuentas y ajustes.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400 shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-blue-400">2. Contador</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  Dashboard financiero, libro diario, conceptos y cierres mensuales auditados.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-400">3. Cajero</div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  Asientos contables diarios y arqueo/cierre de caja de su turno.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8 text-left">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <DollarSign className="w-4 h-4 text-emerald-400 mb-1" />
            <div className="text-xs font-semibold text-white">Entradas/Salidas</div>
            <div className="text-[10px] text-slate-400">Libro diario cronológico</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <BookOpen className="w-4 h-4 text-amber-400 mb-1" />
            <div className="text-xs font-semibold text-white">Víveres & Fijos</div>
            <div className="text-[10px] text-slate-400">Subcuentas específicas</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <Database className="w-4 h-4 text-blue-400 mb-1" />
            <div className="text-xs font-semibold text-white">SQLite Backend</div>
            <div className="text-[10px] text-slate-400">Base de datos local</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <Lock className="w-4 h-4 text-purple-400 mb-1" />
            <div className="text-xs font-semibold text-white">PDF & Excel</div>
            <div className="text-[10px] text-slate-400">Informes oficiales</div>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          onClick={onStart}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base transition-all duration-200 shadow-xl shadow-emerald-500/25 hover:scale-[1.02] cursor-pointer"
        >
          <span>Iniciar Sesión en el Sistema</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="mt-8 text-xs text-slate-500 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Base de datos SQLite activa • Seguridad por roles habilitada</span>
        </div>
      </div>
    </div>
  );
};
