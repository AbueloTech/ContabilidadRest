import {
  Category,
  Transaction,
  CashClosure,
  BusinessSettings,
  DashboardStats,
  User,
} from '../types';

const API_BASE = '/api';

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<{ success: boolean; user: User }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    return data;
  },

  updateProfile: async (data: {
    id: number;
    currentPassword?: string;
    newUsername: string;
    newName: string;
    newPassword?: string;
  }): Promise<{ success: boolean; user: User }> => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Error al actualizar perfil');
    return resData;
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Error al obtener usuarios');
    return res.json();
  },

  createUser: async (user: Partial<User> & { password: string }): Promise<void> => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear usuario');
  },

  updateUser: async (id: number, user: Partial<User> & { password?: string }): Promise<void> => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar usuario');
  },

  deleteUser: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar usuario');
  },

  // Categories & Subcategories
  getCategories: async (): Promise<Category[]> => {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Error al cargar categorías');
    return res.json();
  },

  createCategory: async (category: Partial<Category>): Promise<void> => {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear concepto');
  },

  updateCategory: async (id: number, category: Partial<Category>): Promise<void> => {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar concepto');
  },

  deleteCategory: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar concepto');
  },

  createSubcategory: async (sub: {
    category_id: number;
    name: string;
    description?: string;
    default_tax_rate?: number;
  }): Promise<void> => {
    const res = await fetch(`${API_BASE}/subcategories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear subconcepto');
  },

  updateSubcategory: async (id: number, sub: {
    name: string;
    description?: string;
    default_tax_rate?: number;
  }): Promise<void> => {
    const res = await fetch(`${API_BASE}/subcategories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar subconcepto');
  },

  deleteSubcategory: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/subcategories/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar subconcepto');
  },

  // Transactions
  getTransactions: async (filters: {
    startDate?: string;
    endDate?: string;
    type?: string;
    categoryId?: string;
    paymentMethod?: string;
    search?: string;
  } = {}): Promise<Transaction[]> => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.type && filters.type !== 'all') params.append('type', filters.type);
    if (filters.categoryId && filters.categoryId !== 'all') params.append('categoryId', filters.categoryId);
    if (filters.paymentMethod && filters.paymentMethod !== 'all') params.append('paymentMethod', filters.paymentMethod);
    if (filters.search) params.append('search', filters.search);

    const res = await fetch(`${API_BASE}/transactions?${params.toString()}`);
    if (!res.ok) throw new Error('Error al obtener asientos contables');
    return res.json();
  },

  createTransaction: async (tx: Partial<Transaction>): Promise<void> => {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al registrar asiento');
  },

  updateTransaction: async (id: number, tx: Partial<Transaction>): Promise<void> => {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar asiento');
  },

  deleteTransaction: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar asiento');
  },

  // Dashboard Stats
  getDashboardStats: async (month?: string, year?: string): Promise<DashboardStats> => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);

    const res = await fetch(`${API_BASE}/dashboard/stats?${params.toString()}`);
    if (!res.ok) throw new Error('Error al cargar métricas del dashboard');
    return res.json();
  },

  // Cash Closures
  getClosures: async (): Promise<CashClosure[]> => {
    const res = await fetch(`${API_BASE}/closures`);
    if (!res.ok) throw new Error('Error al obtener cierres de caja');
    return res.json();
  },

  createClosure: async (closure: Partial<CashClosure>): Promise<void> => {
    const res = await fetch(`${API_BASE}/closures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(closure),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al registrar cierre');
  },

  // Business Settings
  getSettings: async (): Promise<BusinessSettings> => {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Error al cargar configuración');
    return res.json();
  },

  updateSettings: async (settings: Partial<BusinessSettings>): Promise<void> => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar configuración');
  },

  resetDatabase: async (
    adminPassword: string,
    mode: 'transactions_only' | 'all' = 'transactions_only'
  ): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/settings/reset-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPassword, mode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al limpiar base de datos');
    return data;
  },
};
