import React from 'react';
import {
  Utensils,
  LayoutDashboard,
  BookOpen,
  Lock,
  Tags,
  Users,
  Building,
  LogOut,
  Database,
  Download,
  UserCheck,
  Sparkles,
  Shield,
  Key,
} from 'lucide-react';
import { User, BusinessSettings } from '../types';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
  settings: BusinessSettings;
  onOpenSettings: () => void;
  onOpenUsers: () => void;
  onOpenProfile: () => void;
  onOpenSplash: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  onLogout,
  settings,
  onOpenSettings,
  onOpenUsers,
  onOpenProfile,
  onOpenSplash,
}) => {
  const downloadSqliteBackup = () => {
    window.location.href = '/api/export/backup-sqlite';
  };

  const role = currentUser.role;

  const roleBadgeColor = {
    admin: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    contador: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    cajero: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  }[role] || 'bg-slate-500/20 text-slate-400';

  const roleLabel = {
    admin: 'Administrador (Gerente)',
    contador: 'Contador Auditor',
    cajero: 'Cajero Operador',
  }[role] || role;

  // Determine authorized tabs based on strict RBAC
  const canAccessDashboard = role === 'admin' || role === 'contador';
  const canAccessLedger = true; // All roles need access to register/view entries
  const canAccessClosure = true; // Admin/Contador (monthly & daily), Cajero (daily only)
  const canAccessConcepts = role === 'admin' || role === 'contador';
  const canAccessUsers = role === 'admin';
  const canAccessSettings = role === 'admin';

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Splash shortcut */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSplash}
              title="Ver presentación y bienvenida"
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20 hover:scale-105 transition-transform cursor-pointer shrink-0"
            >
              <Utensils className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block truncate leading-tight">
                {settings.business_name || 'Sabor & Cuentas'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-emerald-400 font-medium">
                  Contabilidad SQLite
                </span>
                <span className="text-[10px] text-slate-500">•</span>
                <button
                  onClick={onOpenSplash}
                  className="text-[10px] text-slate-400 hover:text-emerald-300 underline cursor-pointer"
                >
                  Bienvenida
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Links with RBAC */}
          <nav className="hidden md:flex items-center gap-1">
            {canAccessDashboard && (
              <button
                onClick={() => onTabChange('dashboard')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            )}

            {canAccessLedger && (
              <button
                onClick={() => onTabChange('ledger')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'ledger'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Libro Diario</span>
              </button>
            )}

            {canAccessClosure && (
              <button
                onClick={() => onTabChange('closure')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'closure'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>{role === 'cajero' ? 'Arqueo de Turno' : 'Cierre de Caja'}</span>
              </button>
            )}

            {canAccessConcepts && (
              <button
                onClick={() => onTabChange('concepts')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentTab === 'concepts'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Tags className="w-4 h-4" />
                <span>Conceptos & Fijos</span>
              </button>
            )}
          </nav>

          {/* Right Controls & User Info */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* SQLite Backup Button (Admin only) */}
            {canAccessSettings && (
              <button
                onClick={downloadSqliteBackup}
                title="Descargar copia de seguridad de la Base de Datos SQLite (.sqlite)"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 font-medium transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>SQLite</span>
                <Download className="w-3 h-3 text-slate-400" />
              </button>
            )}

            {/* Admin Management Buttons */}
            {canAccessUsers && (
              <button
                onClick={onOpenUsers}
                title="Gestión de Usuarios y Roles (Exclusivo Administrador)"
                className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4" />
              </button>
            )}

            {canAccessSettings && (
              <button
                onClick={onOpenSettings}
                title="Configuración de la Empresa (Exclusivo Administrador)"
                className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Building className="w-4 h-4" />
              </button>
            )}

            {/* My Account & Profile Button (Available to ALL users) */}
            <button
              onClick={onOpenProfile}
              title="Mi Perfil / Cambiar mi Usuario y Contraseña"
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 transition-all cursor-pointer group"
            >
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-white block leading-tight group-hover:text-emerald-300 transition-colors">
                  {currentUser.name}
                </span>
                <span
                  className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border mt-0.5 ${roleBadgeColor}`}
                >
                  {role}
                </span>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-900 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                <Key className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              title="Cerrar Sesión Segura"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar with RBAC */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80 text-xs">
          {canAccessDashboard && (
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-2 py-1 rounded-md font-medium ${
                currentTab === 'dashboard' ? 'text-emerald-400 bg-slate-800 font-bold' : 'text-slate-400'
              }`}
            >
              Dashboard
            </button>
          )}

          {canAccessLedger && (
            <button
              onClick={() => onTabChange('ledger')}
              className={`px-2 py-1 rounded-md font-medium ${
                currentTab === 'ledger' ? 'text-emerald-400 bg-slate-800 font-bold' : 'text-slate-400'
              }`}
            >
              Diario
            </button>
          )}

          {canAccessClosure && (
            <button
              onClick={() => onTabChange('closure')}
              className={`px-2 py-1 rounded-md font-medium ${
                currentTab === 'closure' ? 'text-emerald-400 bg-slate-800 font-bold' : 'text-slate-400'
              }`}
            >
              Cierre
            </button>
          )}

          {canAccessConcepts && (
            <button
              onClick={() => onTabChange('concepts')}
              className={`px-2 py-1 rounded-md font-medium ${
                currentTab === 'concepts' ? 'text-emerald-400 bg-slate-800 font-bold' : 'text-slate-400'
              }`}
            >
              Conceptos
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
