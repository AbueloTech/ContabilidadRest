import React, { useState, useEffect } from 'react';
import { Splash } from './components/Splash';
import { Login } from './components/Login';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { Ledger } from './components/Ledger';
import { CashClosureComponent } from './components/CashClosure';
import { ConceptSettings } from './components/ConceptSettings';
import { TransactionModal } from './components/TransactionModal';
import { UsersModal } from './components/UsersModal';
import { BusinessSettingsModal } from './components/BusinessSettingsModal';
import { ProfileModal } from './components/ProfileModal';
import { User, Category, BusinessSettings, Transaction } from './types';
import { api } from './services/api';

const STORAGE_KEY = 'sabor_cuentas_session';

export default function App() {
  const [appState, setAppState] = useState<'splash' | 'login' | 'app'>('splash');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Business settings & categories
  const [settings, setSettings] = useState<BusinessSettings>({
    business_name: 'Restaurant Terreno Broaster',
    tax_id: 'J-40982319-2',
    currency_symbol: '$',
    currency_code: 'USD',
    phone: '+1 (555) 349-8201',
    address: 'Av. Gastronómica 142, Zona Centro',
    fiscal_regime: 'Régimen Simplificado para Restaurantes',
    initial_cash_fund: 200,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Modals
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Trigger state to notify child views (like dashboard/ledger) to refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load initial settings and restore session if present
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.role) {
          setCurrentUser(parsed);
          setAppState('app');
          if (parsed.role === 'cajero') {
            setCurrentTab('ledger');
          }
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingInitial(true);
      const [fetchedSettings, fetchedCategories] = await Promise.all([
        api.getSettings(),
        api.getCategories(),
      ]);
      if (fetchedSettings && fetchedSettings.business_name) {
        setSettings(fetchedSettings);
      }
      setCategories(fetchedCategories);
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const reloadCategories = async () => {
    try {
      const fetched = await api.getCategories();
      setCategories(fetched);
    } catch (err) {
      console.error('Error reloading categories:', err);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setAppState('app');

    // Role-based initial landing
    if (user.role === 'cajero') {
      setCurrentTab('ledger');
    } else {
      setCurrentTab('dashboard');
    }
    loadInitialData();
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    setAppState('splash');
  };

  const handleUserUpdated = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
  };

  const openNewTransaction = () => {
    setEditingTransaction(null);
    setShowTransactionModal(true);
  };

  const openEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setShowTransactionModal(true);
  };

  const handleTransactionSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // 1. Splash Screen
  if (appState === 'splash') {
    return (
      <Splash
        onStart={() => setAppState('login')}
        settings={settings}
      />
    );
  }

  // 2. Login Screen
  if (appState === 'login' || !currentUser) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onBackToSplash={() => setAppState('splash')}
        settings={settings}
      />
    );
  }

  // Role Access Guard: Ensure cajero cannot access unauthorized tabs
  const isCajero = currentUser.role === 'cajero';
  const effectiveTab = isCajero && (currentTab === 'dashboard' || currentTab === 'concepts')
    ? 'ledger'
    : currentTab;

  // 3. Main Application Dashboard & Modules
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <Navbar
        currentTab={effectiveTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        currentUser={currentUser}
        onLogout={handleLogout}
        settings={settings}
        onOpenSettings={() => {
          if (currentUser.role === 'admin') setShowSettingsModal(true);
        }}
        onOpenUsers={() => {
          if (currentUser.role === 'admin') setShowUsersModal(true);
        }}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenSplash={() => setAppState('splash')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {effectiveTab === 'dashboard' && currentUser.role !== 'cajero' && (
          <Dashboard
            key={`dashboard-${refreshTrigger}`}
            settings={settings}
            currentUser={currentUser}
            onOpenNewTransaction={openNewTransaction}
            onNavigateToLedger={() => setCurrentTab('ledger')}
            onNavigateToClosure={() => setCurrentTab('closure')}
          />
        )}

        {effectiveTab === 'ledger' && (
          <Ledger
            key={`ledger-${refreshTrigger}`}
            settings={settings}
            categories={categories}
            currentUser={currentUser}
            onOpenNewTransaction={openNewTransaction}
            onEditTransaction={openEditTransaction}
          />
        )}

        {effectiveTab === 'closure' && (
          <CashClosureComponent
            key={`closure-${refreshTrigger}`}
            settings={settings}
            currentUser={currentUser}
          />
        )}

        {effectiveTab === 'concepts' && currentUser.role !== 'cajero' && (
          <ConceptSettings
            categories={categories}
            onReloadCategories={reloadCategories}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {settings.business_name} • Sistema Contable de Entradas y Salidas
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAppState('splash')}
              className="text-slate-400 hover:text-emerald-400 underline cursor-pointer"
            >
              Pantalla de Bienvenida
            </button>
            <span className="text-slate-700">•</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Base SQLite conectada
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        onSuccess={handleTransactionSuccess}
        categories={categories}
        onReloadCategories={reloadCategories}
        editingTransaction={editingTransaction}
        currentUser={currentUser}
        settings={settings}
      />

      {currentUser.role === 'admin' && (
        <>
          <UsersModal
            isOpen={showUsersModal}
            onClose={() => setShowUsersModal(false)}
            currentUser={currentUser}
          />

          <BusinessSettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            settings={settings}
            onSettingsUpdated={(newSettings) => setSettings(newSettings)}
            onDataReset={() => {
              setRefreshTrigger((prev) => prev + 1);
              reloadCategories();
              loadInitialData();
            }}
          />
        </>
      )}

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}
