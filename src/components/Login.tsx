import React, { useState } from 'react';
import {
  Utensils,
  Lock,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Calculator,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { api } from '../services/api';
import { User, BusinessSettings } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onBackToSplash: () => void;
  settings?: BusinessSettings;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onBackToSplash, settings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoAccess, setShowDemoAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const businessName = settings?.business_name || 'Restaurant Terreno Broaster';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingrese su usuario y contraseña');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.login(username.trim(), password.trim());
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <button
            onClick={onBackToSplash}
            title="Ver pantalla de bienvenida"
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-3 hover:scale-105 transition-transform cursor-pointer"
          >
            <Utensils className="w-7 h-7" />
          </button>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Iniciar Sesión
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {businessName} • Control Contable
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Nombre de Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ingrese su usuario"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  Verificando credenciales...
                </span>
              ) : (
                <>
                  <span>Entrar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice on Changing Password */}
          <div className="mt-5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Cada usuario puede cambiar su clave y nombre de usuario en cualquier momento desde <strong>"Mi Cuenta / Perfil"</strong> una vez inicie sesión.
            </span>
          </div>

          {/* Collapsible Demo Quick-Access Section */}
          <div className="mt-5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowDemoAccess(!showDemoAccess)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-300 py-1 cursor-pointer"
            >
              <span>{showDemoAccess ? 'Ocultar credenciales de prueba inicial' : '¿Probar perfiles de ejemplo inicial? (Opcional)'}</span>
              {showDemoAccess ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDemoAccess && (
              <div className="mt-3 space-y-2 animate-in fade-in">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin', 'admin123')}
                    className="p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-400 mb-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold">Admin</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">Carlos M.</div>
                    <div className="text-[9px] text-slate-500 font-mono">admin123</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('contador', 'contador123')}
                    className="p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-blue-400 mb-0.5">
                      <Calculator className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold">Contador</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">Valentina S.</div>
                    <div className="text-[9px] text-slate-500 font-mono">contador123</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('cajero', 'cajero123')}
                    className="p-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-amber-400 mb-0.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold">Cajero</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">Mateo Rivas</div>
                    <div className="text-[9px] text-slate-500 font-mono">cajero123</div>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 italic text-center">
                  * Recuerde cambiar las claves en "Mi Cuenta" para asegurar su aplicación.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Back to Splash Button */}
        <div className="text-center mt-5">
          <button
            onClick={onBackToSplash}
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            ← Volver a la pantalla de bienvenida (Splash)
          </button>
        </div>
      </div>
    </div>
  );
};
