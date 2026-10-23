import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getDatabase, saveDatabase } from './src/server/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Helper for sql.js queries returning objects
function queryAll(db: any, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// -------------------------------------------------------------
// Auth & Users
// -------------------------------------------------------------
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const db = await getDatabase();
    const rows = queryAll(db, 'SELECT id, username, name, role, active, created_at FROM users WHERE username = ? AND password = ?', [username.trim(), password.trim()]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas. Verifique usuario o contraseña.' });
    }

    const user = rows[0];
    if (user.active !== 1) {
      return res.status(403).json({ error: 'Este usuario se encuentra inactivo. Contacte al administrador.' });
    }

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/profile', async (req: Request, res: Response) => {
  try {
    const { id, currentPassword, newUsername, newName, newPassword } = req.body;
    if (!id || !newUsername || !newName) {
      return res.status(400).json({ error: 'Datos incompletos para actualizar perfil' });
    }

    const db = await getDatabase();
    const rows = queryAll(db, 'SELECT id, username, password, name, role, active FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const current = rows[0];

    // If changing password or sensitive data, verify current password
    if (currentPassword) {
      if (current.password !== currentPassword.trim()) {
        return res.status(401).json({ error: 'La contraseña actual ingresada es incorrecta' });
      }
    }

    // Check unique username if changed
    if (newUsername.trim() !== current.username) {
      const existing = queryAll(db, 'SELECT id FROM users WHERE username = ? AND id != ?', [newUsername.trim(), id]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso por otra persona' });
      }
    }

    const finalPass = (newPassword && newPassword.trim()) ? newPassword.trim() : current.password;

    db.run(
      'UPDATE users SET username = ?, name = ?, password = ? WHERE id = ?',
      [newUsername.trim(), newName.trim(), finalPass, id]
    );
    saveDatabase();

    const updatedUser = {
      id: current.id,
      username: newUsername.trim(),
      name: newName.trim(),
      role: current.role,
      active: current.active,
    };

    res.json({ success: true, message: 'Perfil actualizado exitosamente', user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const users = queryAll(db, 'SELECT id, username, name, role, active, created_at FROM users ORDER BY id ASC');
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    const db = await getDatabase();
    const existing = queryAll(db, 'SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }

    const now = new Date().toISOString();
    db.run(
      'INSERT INTO users (username, password, name, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      [username.trim(), password.trim(), name.trim(), role, now]
    );
    saveDatabase();
    res.status(201).json({ success: true, message: 'Usuario creado exitosamente' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { username, name, role, password, active } = req.body;
    const db = await getDatabase();

    if (username && username.trim()) {
      const existing = queryAll(db, 'SELECT id FROM users WHERE username = ? AND id != ?', [username.trim(), id]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'El nombre de usuario ya existe' });
      }
    }

    if (password && password.trim()) {
      if (username && username.trim()) {
        db.run('UPDATE users SET username = ?, name = ?, role = ?, password = ?, active = ? WHERE id = ?',
          [username.trim(), name, role, password.trim(), active ? 1 : 0, id]);
      } else {
        db.run('UPDATE users SET name = ?, role = ?, password = ?, active = ? WHERE id = ?',
          [name, role, password.trim(), active ? 1 : 0, id]);
      }
    } else {
      if (username && username.trim()) {
        db.run('UPDATE users SET username = ?, name = ?, role = ?, active = ? WHERE id = ?',
          [username.trim(), name, role, active ? 1 : 0, id]);
      } else {
        db.run('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?',
          [name, role, active ? 1 : 0, id]);
      }
    }
    saveDatabase();
    res.json({ success: true, message: 'Usuario actualizado' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (id === 1) {
      return res.status(400).json({ error: 'No se puede eliminar el usuario administrador principal' });
    }
    const db = await getDatabase();
    db.run('DELETE FROM users WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Categories & Subcategories (Conceptos y Subconceptos)
// -------------------------------------------------------------
app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const categories = queryAll(db, 'SELECT * FROM categories ORDER BY type DESC, name ASC');
    const subcategories = queryAll(db, 'SELECT * FROM subcategories ORDER BY name ASC');

    const result = categories.map((cat: any) => ({
      ...cat,
      is_fixed: Boolean(cat.is_fixed),
      subcategories: subcategories.filter((sub: any) => sub.category_id === cat.id)
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req: Request, res: Response) => {
  try {
    const { code, name, type, description, icon, color, is_fixed } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Nombre y tipo son obligatorios' });
    }
    const db = await getDatabase();
    const generatedCode = code || `${type === 'ingreso' ? 'ING' : 'GAS'}-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    db.run(
      'INSERT INTO categories (code, name, type, description, icon, color, is_fixed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [generatedCode, name.trim(), type, description || '', icon || 'Tag', color || '#3b82f6', is_fixed ? 1 : 0, now]
    );
    saveDatabase();
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, type, description, icon, color, is_fixed } = req.body;
    const db = await getDatabase();

    db.run(
      'UPDATE categories SET name = ?, type = ?, description = ?, icon = ?, color = ?, is_fixed = ? WHERE id = ?',
      [name.trim(), type, description || '', icon || 'Tag', color || '#3b82f6', is_fixed ? 1 : 0, id]
    );
    saveDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const db = await getDatabase();

    const used = queryAll(db, 'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?', [id]);
    if (used[0]?.count > 0) {
      return res.status(400).json({ error: `No se puede eliminar porque tiene ${used[0].count} transacciones registradas` });
    }

    db.run('DELETE FROM subcategories WHERE category_id = ?', [id]);
    db.run('DELETE FROM categories WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subcategories', async (req: Request, res: Response) => {
  try {
    const { category_id, name, description, default_tax_rate } = req.body;
    if (!category_id || !name) {
      return res.status(400).json({ error: 'Categoría y nombre son obligatorios' });
    }
    const db = await getDatabase();
    const now = new Date().toISOString();

    db.run(
      'INSERT INTO subcategories (category_id, name, description, default_tax_rate, created_at) VALUES (?, ?, ?, ?, ?)',
      [category_id, name.trim(), description || '', default_tax_rate || 0, now]
    );
    saveDatabase();
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subcategories/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, default_tax_rate } = req.body;
    const db = await getDatabase();

    db.run(
      'UPDATE subcategories SET name = ?, description = ?, default_tax_rate = ? WHERE id = ?',
      [name.trim(), description || '', default_tax_rate || 0, id]
    );
    saveDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subcategories/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const db = await getDatabase();
    db.run('DELETE FROM subcategories WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Transactions (Libro Diario / Asientos Contables)
// -------------------------------------------------------------
app.get('/api/transactions', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, type, categoryId, paymentMethod, search } = req.query;
    const db = await getDatabase();

    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params: any[] = [];

    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }
    if (type && type !== 'all') {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (categoryId && categoryId !== 'all') {
      sql += ' AND category_id = ?';
      params.push(parseInt(categoryId as string));
    }
    if (paymentMethod && paymentMethod !== 'all') {
      sql += ' AND payment_method = ?';
      params.push(paymentMethod);
    }
    if (search) {
      sql += ' AND (description LIKE ? OR reference_number LIKE ? OR subcategory_name LIKE ? OR category_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY date DESC, time DESC, id DESC';
    const transactions = queryAll(db, sql, params);

    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req: Request, res: Response) => {
  try {
    const {
      date,
      time,
      type,
      category_id,
      subcategory_id,
      amount,
      tax_amount,
      payment_method,
      reference_number,
      description,
      user_id,
      user_name
    } = req.body;

    if (!date || !type || !category_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Campos requeridos incompletos' });
    }

    const db = await getDatabase();
    const cat = queryAll(db, 'SELECT name FROM categories WHERE id = ?', [category_id]);
    const category_name = cat[0]?.name || 'General';

    let subcategory_name = null;
    if (subcategory_id) {
      const sub = queryAll(db, 'SELECT name FROM subcategories WHERE id = ?', [subcategory_id]);
      subcategory_name = sub[0]?.name || null;
    }

    const tTime = time || new Date().toTimeString().slice(0, 5);
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO transactions 
       (date, time, type, category_id, category_name, subcategory_id, subcategory_name, amount, tax_amount, payment_method, reference_number, description, user_id, user_name, closure_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?)`,
      [
        date,
        tTime,
        type,
        category_id,
        category_name,
        subcategory_id || null,
        subcategory_name,
        parseFloat(amount),
        parseFloat(tax_amount || 0),
        payment_method,
        reference_number || '',
        description || '',
        user_id || 1,
        user_name || 'Sistema',
        now
      ]
    );
    saveDatabase();
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      date,
      time,
      type,
      category_id,
      subcategory_id,
      amount,
      tax_amount,
      payment_method,
      reference_number,
      description
    } = req.body;

    const db = await getDatabase();
    const cat = queryAll(db, 'SELECT name FROM categories WHERE id = ?', [category_id]);
    const category_name = cat[0]?.name || '';

    let subcategory_name = null;
    if (subcategory_id) {
      const sub = queryAll(db, 'SELECT name FROM subcategories WHERE id = ?', [subcategory_id]);
      subcategory_name = sub[0]?.name || null;
    }

    db.run(
      `UPDATE transactions 
       SET date = ?, time = ?, type = ?, category_id = ?, category_name = ?, subcategory_id = ?, subcategory_name = ?, amount = ?, tax_amount = ?, payment_method = ?, reference_number = ?, description = ?
       WHERE id = ?`,
      [
        date,
        time,
        type,
        category_id,
        category_name,
        subcategory_id || null,
        subcategory_name,
        parseFloat(amount),
        parseFloat(tax_amount || 0),
        payment_method,
        reference_number || '',
        description || '',
        id
      ]
    );
    saveDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const db = await getDatabase();
    db.run('DELETE FROM transactions WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Dashboard Statistics & Analytics
// -------------------------------------------------------------
app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const selectedYear = year ? String(year) : String(now.getFullYear());
    const selectedMonth = month ? String(month).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${selectedYear}-${selectedMonth}`;

    const db = await getDatabase();

    // Current month transactions
    const monthTx = queryAll(db, "SELECT * FROM transactions WHERE date LIKE ? ORDER BY date ASC", [`${prefix}%`]);
    
    let totalIncome = 0;
    let totalExpenses = 0;
    let cashIncome = 0;
    let cashExpenses = 0;
    let fixedExpenses = 0;
    let variableExpenses = 0;

    const categories = queryAll(db, 'SELECT id, is_fixed FROM categories');
    const fixedCatMap = new Set(categories.filter((c: any) => c.is_fixed === 1).map((c: any) => c.id));

    const expensesByCategory: Record<string, { name: string; amount: number; color?: string }> = {};
    const incomeByCategory: Record<string, { name: string; amount: number; color?: string }> = {};

    for (const t of monthTx) {
      const amt = Number(t.amount);
      if (t.type === 'ingreso') {
        totalIncome += amt;
        if (t.payment_method === 'efectivo') cashIncome += amt;
        if (!incomeByCategory[t.category_name]) {
          incomeByCategory[t.category_name] = { name: t.category_name, amount: 0 };
        }
        incomeByCategory[t.category_name].amount += amt;
      } else {
        totalExpenses += amt;
        if (t.payment_method === 'efectivo') cashExpenses += amt;
        if (fixedCatMap.has(t.category_id)) {
          fixedExpenses += amt;
        } else {
          variableExpenses += amt;
        }
        if (!expensesByCategory[t.category_name]) {
          expensesByCategory[t.category_name] = { name: t.category_name, amount: 0 };
        }
        expensesByCategory[t.category_name].amount += amt;
      }
    }

    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    // Daily breakdown for graph
    const dailyMap: Record<string, { day: string; date: string; income: number; expenses: number }> = {};
    const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${prefix}-${dayStr}`;
      dailyMap[dateStr] = { day: dayStr, date: dateStr, income: 0, expenses: 0 };
    }
    for (const t of monthTx) {
      if (dailyMap[t.date]) {
        if (t.type === 'ingreso') dailyMap[t.date].income += Number(t.amount);
        else dailyMap[t.date].expenses += Number(t.amount);
      }
    }

    // Breakdown for Víveres / Insumos subconcepts (specifically requested)
    const groceriesTx = queryAll(db, `
      SELECT subcategory_name, SUM(amount) as total 
      FROM transactions 
      WHERE date LIKE ? AND (category_name LIKE '%Víveres%' OR category_name LIKE '%Viveres%')
      GROUP BY subcategory_name 
      ORDER BY total DESC
    `, [`${prefix}%`]);

    // Breakdown for Gastos Fijos (luz, agua, alquiler, gas, etc.)
    const fixedTx = queryAll(db, `
      SELECT subcategory_name, SUM(amount) as total 
      FROM transactions 
      WHERE date LIKE ? AND (category_name LIKE '%Fijos%' OR category_name LIKE '%Servicios%')
      GROUP BY subcategory_name 
      ORDER BY total DESC
    `, [`${prefix}%`]);

    res.json({
      period: prefix,
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      cashInHand: cashIncome - cashExpenses,
      fixedExpenses,
      variableExpenses,
      transactionCount: monthTx.length,
      expensesByCategory: Object.values(expensesByCategory),
      incomeByCategory: Object.values(incomeByCategory),
      groceriesBreakdown: groceriesTx,
      fixedBreakdown: fixedTx,
      dailyTrend: Object.values(dailyMap),
      recentTransactions: monthTx.slice(-8).reverse()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Cash Closures (Cierre de Caja Diario / Mensual)
// -------------------------------------------------------------
app.get('/api/closures', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const closures = queryAll(db, 'SELECT * FROM cash_closures ORDER BY id DESC');
    res.json(closures);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/closures', async (req: Request, res: Response) => {
  try {
    const {
      period_type,
      period_label,
      start_date,
      end_date,
      total_income,
      total_expenses,
      net_balance,
      expected_cash,
      counted_cash,
      cash_difference,
      closed_by_user,
      notes
    } = req.body;

    const db = await getDatabase();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO cash_closures
       (period_type, period_label, start_date, end_date, total_income, total_expenses, net_balance, expected_cash, counted_cash, cash_difference, closed_by_user, closed_at, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cerrado')`,
      [
        period_type || 'mensual',
        period_label,
        start_date,
        end_date,
        parseFloat(total_income || 0),
        parseFloat(total_expenses || 0),
        parseFloat(net_balance || 0),
        parseFloat(expected_cash || 0),
        parseFloat(counted_cash || 0),
        parseFloat(cash_difference || 0),
        closed_by_user || 'Cajero',
        now,
        notes || '',
      ]
    );

    saveDatabase();
    res.status(201).json({ success: true, message: 'Cierre de caja registrado exitosamente' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Business Settings
// -------------------------------------------------------------
app.get('/api/settings', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const settings = queryAll(db, 'SELECT * FROM business_settings WHERE id = 1');
    res.json(settings[0] || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req: Request, res: Response) => {
  try {
    const { business_name, tax_id, currency_symbol, currency_code, phone, address, fiscal_regime, initial_cash_fund } = req.body;
    const db = await getDatabase();

    db.run(
      `UPDATE business_settings 
       SET business_name = ?, tax_id = ?, currency_symbol = ?, currency_code = ?, phone = ?, address = ?, fiscal_regime = ?, initial_cash_fund = ?
       WHERE id = 1`,
      [
        business_name,
        tax_id,
        currency_symbol,
        currency_code,
        phone,
        address,
        fiscal_regime,
        parseFloat(initial_cash_fund || 0)
      ]
    );
    saveDatabase();
    res.json({ success: true, message: 'Configuración actualizada' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset / Wipe daily operational data (requires admin password)
app.post('/api/settings/reset-data', async (req: Request, res: Response) => {
  try {
    const { adminPassword, mode } = req.body;
    if (!adminPassword || !adminPassword.trim()) {
      return res.status(400).json({ error: 'Debe ingresar la contraseña de Administrador para confirmar el reinicio.' });
    }

    const db = await getDatabase();
    const admins = queryAll(db, "SELECT password FROM users WHERE role = 'admin' AND active = 1");
    const matched = admins.some((a: any) => a.password === adminPassword.trim());

    if (!matched) {
      return res.status(401).json({ error: 'Contraseña de Administrador incorrecta. Operación denegada.' });
    }

    // Delete all daily operational transactions and cash closures
    db.run('DELETE FROM transactions');
    db.run('DELETE FROM cash_closures');

    if (mode === 'all') {
      db.run('DELETE FROM subcategories');
      db.run('DELETE FROM categories');
    }

    saveDatabase();
    res.json({
      success: true,
      message: 'Base de datos limpiada exitosamente. Se han restablecido a blanco todos los asientos contables y cierres de caja.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Direct SQLite database file download
app.get('/api/export/backup-sqlite', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const binary = db.export();
    const buffer = Buffer.from(binary);

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="contabilidad-backup-${new Date().toISOString().slice(0, 10)}.sqlite"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Dev & Production Serving
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // In dev, use Vite's connect instance as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built dist directory
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Server] Sabor & Cuentas running at http://localhost:${PORT}`);
  });
}

startServer();
