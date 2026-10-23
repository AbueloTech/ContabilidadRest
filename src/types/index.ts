export type TransactionType = 'ingreso' | 'egreso';

export type PaymentMethod =
  | 'efectivo'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'transferencia'
  | 'pago_movil_zelle'
  | 'otro';

export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'contador' | 'cajero';
  active: number;
  created_at?: string;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  default_tax_rate?: number;
  created_at?: string;
}

export interface Category {
  id: number;
  code: string;
  name: string;
  type: TransactionType;
  description?: string;
  icon?: string;
  color?: string;
  is_fixed: boolean;
  created_at?: string;
  subcategories: Subcategory[];
}

export interface Transaction {
  id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: TransactionType;
  category_id: number;
  category_name: string;
  subcategory_id?: number | null;
  subcategory_name?: string | null;
  amount: number;
  tax_amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  description?: string;
  user_id?: number;
  user_name?: string;
  closure_id?: number | null;
  created_at: string;
}

export interface CashClosure {
  id: number;
  period_type: 'diario' | 'mensual';
  period_label: string;
  start_date: string;
  end_date: string;
  total_income: number;
  total_expenses: number;
  net_balance: number;
  expected_cash: number;
  counted_cash: number;
  cash_difference: number;
  closed_by_user: string;
  closed_at: string;
  notes?: string;
  status: 'cerrado' | 'abierto';
}

export interface BusinessSettings {
  id?: number;
  business_name: string;
  tax_id: string;
  currency_symbol: string;
  currency_code: string;
  phone: string;
  address: string;
  fiscal_regime: string;
  initial_cash_fund: number;
}

export interface DashboardStats {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  cashInHand: number;
  fixedExpenses: number;
  variableExpenses: number;
  transactionCount: number;
  expensesByCategory: Array<{ name: string; amount: number; color?: string }>;
  incomeByCategory: Array<{ name: string; amount: number; color?: string }>;
  groceriesBreakdown: Array<{ subcategory_name: string; total: number }>;
  fixedBreakdown: Array<{ subcategory_name: string; total: number }>;
  dailyTrend: Array<{ day: string; date: string; income: number; expenses: number }>;
  recentTransactions: Transaction[];
}
