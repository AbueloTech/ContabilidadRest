import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'contabilidad.sqlite');

let dbInstance: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(filebuffer);
    try {
      dbInstance.run(`UPDATE business_settings SET business_name = 'Restaurant Terreno Broaster' WHERE business_name = 'Bistró & Restaurante El Portal'`);
      saveDatabase();
    } catch (e) {
      // ignore if table does not exist
    }
  } else {
    dbInstance = new SQL.Database();
    initSchema(dbInstance);
    seedInitialData(dbInstance);
    saveDatabase();
  }

  return dbInstance;
}

export function saveDatabase(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database:', err);
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY,
      business_name TEXT NOT NULL,
      tax_id TEXT,
      currency_symbol TEXT DEFAULT '$',
      currency_code TEXT DEFAULT 'USD',
      phone TEXT,
      address TEXT,
      fiscal_regime TEXT,
      initial_cash_fund REAL DEFAULT 150.00
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'ingreso' | 'egreso'
      description TEXT,
      icon TEXT,
      color TEXT,
      is_fixed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      default_tax_rate REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      type TEXT NOT NULL, -- 'ingreso' | 'egreso'
      category_id INTEGER NOT NULL,
      category_name TEXT NOT NULL,
      subcategory_id INTEGER,
      subcategory_name TEXT,
      amount REAL NOT NULL,
      tax_amount REAL DEFAULT 0,
      payment_method TEXT NOT NULL, -- 'efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'pago_movil_zelle', 'otro'
      reference_number TEXT,
      description TEXT,
      user_id INTEGER,
      user_name TEXT,
      closure_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS cash_closures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_type TEXT NOT NULL, -- 'diario' | 'mensual'
      period_label TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_income REAL NOT NULL,
      total_expenses REAL NOT NULL,
      net_balance REAL NOT NULL,
      expected_cash REAL NOT NULL,
      counted_cash REAL NOT NULL,
      cash_difference REAL NOT NULL,
      closed_by_user TEXT NOT NULL,
      closed_at TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'cerrado'
    );
  `);
}

function seedInitialData(db: Database) {
  const now = new Date().toISOString();

  // Settings
  db.run(`
    INSERT INTO business_settings (id, business_name, tax_id, currency_symbol, currency_code, phone, address, fiscal_regime, initial_cash_fund)
    VALUES (1, 'Restaurant Terreno Broaster', 'J-40982319-2', '$', 'USD', '+1 (555) 349-8201', 'Av. Gastronómica 142, Zona Centro', 'Régimen Simplificado para Restaurantes', 200.00);
  `);

  // Users (password admin123, contador123, cajero123)
  db.run(`
    INSERT INTO users (username, password, name, role, active, created_at)
    VALUES 
      ('admin', 'admin123', 'Carlos Mendoza (Gerente)', 'admin', 1, '${now}'),
      ('contador', 'contador123', 'Lic. Valentina Soto (Contadora)', 'contador', 1, '${now}'),
      ('cajero', 'cajero123', 'Mateo Rivas (Caja Principal)', 'cajero', 1, '${now}');
  `);

  // Categories
  const categories = [
    { code: 'ING-SALON', name: 'Ventas de Salón', type: 'ingreso', desc: 'Consumo directo de comida y bebidas en mesas', icon: 'UtensilsCrossed', color: '#10b981', is_fixed: 0 },
    { code: 'ING-DELIV', name: 'Delivery y Para Llevar', type: 'ingreso', desc: 'Pedidos por delivery propio y apps (Takeout)', icon: 'Truck', color: '#06b6d4', is_fixed: 0 },
    { code: 'ING-EVENT', name: 'Eventos y Reservas', type: 'ingreso', desc: 'Eventos privados, catering y celebraciones especiales', icon: 'CalendarDays', color: '#8b5cf6', is_fixed: 0 },
    { code: 'ING-OTROS', name: 'Otros Ingresos', type: 'ingreso', desc: 'Venta de souvenirs, propinas de salón extraordinarias', icon: 'Coins', color: '#f59e0b', is_fixed: 0 },
    
    // Gastos
    { code: 'GAS-VIV', name: 'Víveres e Insumos', type: 'egreso', desc: 'Ingredientes de cocina, verduras, carnes, harina, aceites', icon: 'Apple', color: '#ef4444', is_fixed: 0 },
    { code: 'GAS-FIJ', name: 'Gastos Fijos y Servicios', type: 'egreso', desc: 'Alquiler del local comercial, luz, agua, gas y telecomunicaciones', icon: 'Building2', color: '#f97316', is_fixed: 1 },
    { code: 'GAS-IMP', name: 'Impuestos y Tasas', type: 'egreso', desc: 'IVA, patentes municipales, retenciones fiscales y aranceles', icon: 'FileSpreadsheet', color: '#6366f1', is_fixed: 1 },
    { code: 'GAS-NOM', name: 'Nómina y Personal', type: 'egreso', desc: 'Salarios del personal de cocina, sala, caja y prestaciones', icon: 'Users', color: '#ec4899', is_fixed: 1 },
    { code: 'GAS-MANT', name: 'Mantenimiento y Equipamiento', type: 'egreso', desc: 'Reparaciones de neveras, hornos, utensilios y mobiliario', icon: 'Wrench', color: '#64748b', is_fixed: 0 },
    { code: 'GAS-OPR', name: 'Gastos Operativos y Limpieza', type: 'egreso', desc: 'Empaques desechables, químicos de limpieza, papelería', icon: 'PackageOpen', color: '#14b8a6', is_fixed: 0 },
  ];

  for (const cat of categories) {
    db.run(
      `INSERT INTO categories (code, name, type, description, icon, color, is_fixed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [cat.code, cat.name, cat.type, cat.desc, cat.icon, cat.color, cat.is_fixed, now]
    );
  }

  // Fetch created category IDs
  const catRows = db.exec('SELECT id, code FROM categories');
  const catMap: Record<string, number> = {};
  if (catRows.length && catRows[0].values) {
    for (const val of catRows[0].values) {
      catMap[val[1] as string] = val[0] as number;
    }
  }

  // Subcategories
  const subcategories = [
    // Víveres e Insumos (Highlight requested by user)
    { cat: 'GAS-VIV', name: 'Harina y Panadería', desc: 'Harina de trigo, maíz, masas y pan artesanal' },
    { cat: 'GAS-VIV', name: 'Aceite y Grasas', desc: 'Aceite de oliva, vegetal, mantequilla y margarina' },
    { cat: 'GAS-VIV', name: 'Charcutería y Embutidos', desc: 'Jamones, tocineta, quesos curados, salchichas' },
    { cat: 'GAS-VIV', name: 'Verduras, Frutas y Hortalizas', desc: 'Tomates, cebollas, papas, hojas verdes, cítricos' },
    { cat: 'GAS-VIV', name: 'Carnes, Pollo y Pescado', desc: 'Cortes vacunos, pechugas, mariscos y filetes' },
    { cat: 'GAS-VIV', name: 'Lácteos y Huevos', desc: 'Leche fresca, crema de leche, huevos de granja' },
    { cat: 'GAS-VIV', name: 'Condimentos, Salsas y Especias', desc: 'Pimienta, especias, pasta de tomate, aderezos' },
    { cat: 'GAS-VIV', name: 'Bebidas e Insumos de Bar', desc: 'Café de especialidad, licores, jugos e infusiones' },

    // Gastos Fijos (Highlight requested by user)
    { cat: 'GAS-FIJ', name: 'Alquiler del Local Comercial', desc: 'Canon mensual del inmueble' },
    { cat: 'GAS-FIJ', name: 'Luz y Electricidad', desc: 'Factura mensual del servicio eléctrico de alta potencia' },
    { cat: 'GAS-FIJ', name: 'Agua Potable y Alcantarillado', desc: 'Suministro de agua para cocina y sanitarios' },
    { cat: 'GAS-FIJ', name: 'Teléfono, Internet y POS', desc: 'Fibra óptica de alta velocidad y líneas para datáfonos' },
    { cat: 'GAS-FIJ', name: 'Gas Industrial / Bombonas', desc: 'Suministro de gas canalizado para fogones y hornos' },
    { cat: 'GAS-FIJ', name: 'Alarma y Seguridad Monitoreada', desc: 'Monitoreo 24/7 y cámaras de vigilancia' },

    // Impuestos (Highlight requested by user)
    { cat: 'GAS-IMP', name: 'IVA Declaración Mensual', desc: 'Pago neto de débito y crédito fiscal' },
    { cat: 'GAS-IMP', name: 'Patente y Tasas Municipales', desc: 'Tasa comercial e industria del ayuntamiento' },
    { cat: 'GAS-IMP', name: 'Retenciones Fiscales', desc: 'Retenciones practicadas de ISR/IVA' },
    { cat: 'GAS-IMP', name: 'Permisos Sanitarios y Bomberos', desc: 'Renovaciones de inspecciones legales' },

    // Nómina
    { cat: 'GAS-NOM', name: 'Sueldos de Cocina', desc: 'Chef ejecutivo, cocineros y asistentes' },
    { cat: 'GAS-NOM', name: 'Sueldos de Sala y Meseros', desc: 'Camareros, capitán y barman' },
    { cat: 'GAS-NOM', name: 'Sueldo de Caja y Administración', desc: 'Personal de tesorería y supervisión' },
    { cat: 'GAS-NOM', name: 'Aportes a la Seguridad Social', desc: 'Seguro médico y previsiones de ley' },

    // Mantenimiento
    { cat: 'GAS-MANT', name: 'Mantenimiento de Cocina y Frío', desc: 'Recarga de gas refrigerante, filtros de campana' },
    { cat: 'GAS-MANT', name: 'Reposición de Menaje y Vajilla', desc: 'Vasos, platos, cubiertos y ollas' },

    // Operativos
    { cat: 'GAS-OPR', name: 'Desechables y Empaques Delivery', desc: 'Cajas ecológicas, bolsas de papel, servilletas' },
    { cat: 'GAS-OPR', name: 'Productos de Limpieza e Higiene', desc: 'Desengrasantes, cloro, sanitizantes' },

    // Ingresos - Salón
    { cat: 'ING-SALON', name: 'Almuerzos y Menú Ejecutivo', desc: 'Platos fuertes servidos durante el turno de almuerzo' },
    { cat: 'ING-SALON', name: 'Cenas y Carta Especial', desc: 'Platos a la carta y especialidades nocturnas' },
    { cat: 'ING-SALON', name: 'Cafetería y Postres', desc: 'Consumos en barra, postres y meriendas' },
    { cat: 'ING-SALON', name: 'Bebidas y Coctelería', desc: 'Vinos, cervezas artesanales y cócteles en mesa' },

    // Ingresos - Delivery
    { cat: 'ING-DELIV', name: 'Pedidos Telefónicos y WhatsApp', desc: 'Repartos locales con flota propia' },
    { cat: 'ING-DELIV', name: 'Plataformas Apps', desc: 'Ingresos netos provenientes de pedidos digitales' },

    // Ingresos - Eventos
    { cat: 'ING-EVENT', name: 'Reserva de Salón para Banquetes', desc: 'Celebraciones privadas y aniversarios' },
    { cat: 'ING-EVENT', name: 'Servicio de Catering Externo', desc: 'Banquetes preparados para oficinas' },

    // Ingresos - Otros
    { cat: 'ING-OTROS', name: 'Propinas Compartidas Salón', desc: 'Fondo de servicio y gratificaciones' }
  ];

  for (const sub of subcategories) {
    const catId = catMap[sub.cat];
    if (catId) {
      db.run(
        `INSERT INTO subcategories (category_id, name, description, default_tax_rate, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [catId, sub.name, sub.desc, 0, now]
      );
    }
  }

  // Preload realistic current month transactions (October 2026)
  const sampleTransactions = [
    // Ingresos Salón
    { d: '2026-10-01', t: '13:45', type: 'ingreso', cat: 'ING-SALON', sub: 'Almuerzos y Menú Ejecutivo', amt: 340.50, tax: 40.86, pay: 'tarjeta_debito', ref: 'FAC-001041', desc: 'Servicio de almuerzo mesa 4, 6 y 8', usr: 'Mateo Rivas (Caja Principal)' },
    { d: '2026-10-01', t: '21:30', type: 'ingreso', cat: 'ING-SALON', sub: 'Cenas y Carta Especial', amt: 520.00, tax: 62.40, pay: 'tarjeta_credito', ref: 'FAC-001042', desc: 'Cena familiar mesa 12 y barra', usr: 'Mateo Rivas (Caja Principal)' },
    
    // Gasto Fijo: Alquiler
    { d: '2026-10-02', t: '10:00', type: 'egreso', cat: 'GAS-FIJ', sub: 'Alquiler del Local Comercial', amt: 1200.00, tax: 0.00, pay: 'transferencia', ref: 'TRF-ALQ-10', desc: 'Pago mensual alquiler local comercial mes de Octubre', usr: 'Carlos Mendoza (Gerente)' },

    // Compra víveres
    { d: '2026-10-02', t: '11:15', type: 'egreso', cat: 'GAS-VIV', sub: 'Carnes, Pollo y Pescado', amt: 380.00, tax: 0.00, pay: 'transferencia', ref: 'FAC-FRIG-88', desc: '50kg lomo de res, 30kg pechuga fresca', usr: 'Lic. Valentina Soto (Contadora)' },
    { d: '2026-10-03', t: '08:30', type: 'egreso', cat: 'GAS-VIV', sub: 'Verduras, Frutas y Hortalizas', amt: 145.20, tax: 0.00, pay: 'efectivo', ref: 'REC-MERC-44', desc: 'Compra mayorista en mercado central: cebollas, papas, lechugas', usr: 'Mateo Rivas (Caja Principal)' },
    { d: '2026-10-03', t: '09:00', type: 'egreso', cat: 'GAS-VIV', sub: 'Harina y Panadería', amt: 95.00, tax: 11.40, pay: 'transferencia', ref: 'FAC-MOL-129', desc: '4 sacos harina 000 para pan focaccia y pastas', usr: 'Carlos Mendoza (Gerente)' },

    // Ingresos fin de semana
    { d: '2026-10-03', t: '14:20', type: 'ingreso', cat: 'ING-SALON', sub: 'Almuerzos y Menú Ejecutivo', amt: 480.00, tax: 57.60, pay: 'tarjeta_debito', ref: 'FAC-001043', desc: 'Consumos turno mediodía', usr: 'Mateo Rivas (Caja Principal)' },
    { d: '2026-10-03', t: '22:00', type: 'ingreso', cat: 'ING-SALON', sub: 'Bebidas y Coctelería', amt: 290.00, tax: 34.80, pay: 'tarjeta_credito', ref: 'FAC-001044', desc: 'Venta de cócteles y copas de vino', usr: 'Mateo Rivas (Caja Principal)' },
    { d: '2026-10-04', t: '20:15', type: 'ingreso', cat: 'ING-DELIV', sub: 'Plataformas Apps', amt: 215.40, tax: 25.85, pay: 'transferencia', ref: 'DEL-OCT-04', desc: 'Cierre semanal de pedidos delivery apps', usr: 'Mateo Rivas (Caja Principal)' },

    // Gastos Fijos: Servicios
    { d: '2026-10-05', t: '09:45', type: 'egreso', cat: 'GAS-FIJ', sub: 'Luz y Electricidad', amt: 310.00, tax: 37.20, pay: 'transferencia', ref: 'SRV-LUZ-1026', desc: 'Factura eléctrica comercial con refrigeradores industriales', usr: 'Lic. Valentina Soto (Contadora)' },
    { d: '2026-10-05', t: '10:00', type: 'egreso', cat: 'GAS-FIJ', sub: 'Agua Potable y Alcantarillado', amt: 85.00, tax: 0.00, pay: 'transferencia', ref: 'SRV-AGU-1026', desc: 'Consumo de agua municipal', usr: 'Lic. Valentina Soto (Contadora)' },
    { d: '2026-10-05', t: '11:00', type: 'egreso', cat: 'GAS-FIJ', sub: 'Gas Industrial / Bombonas', amt: 120.00, tax: 14.40, pay: 'efectivo', ref: 'REC-GAS-901', desc: 'Recarga 3 cilindros gas industrial cocina', usr: 'Mateo Rivas (Caja Principal)' },
    { d: '2026-10-06', t: '15:00', type: 'egreso', cat: 'GAS-FIJ', sub: 'Teléfono, Internet y POS', amt: 65.00, tax: 7.80, pay: 'transferencia', ref: 'TEL-FIB-881', desc: 'Internet 500Mbps y línea telefónica para pedidos', usr: 'Lic. Valentina Soto (Contadora)' },

    // Víveres aceite y charcutería
    { d: '2026-10-07', t: '12:00', type: 'egreso', cat: 'GAS-VIV', sub: 'Aceite y Grasas', amt: 130.00, tax: 15.60, pay: 'transferencia', ref: 'FAC-ACEI-40', desc: '2 cajas aceite de oliva extra virgen y frituras', usr: 'Lic. Valentina Soto (Contadora)' },
    { d: '2026-10-08', t: '10:30', type: 'egreso', cat: 'GAS-VIV', sub: 'Charcutería y Embutidos', amt: 210.00, tax: 25.20, pay: 'transferencia', ref: 'FAC-CHAR-18', desc: 'Queso mozzarella, jamón serrano y parmesano', usr: 'Carlos Mendoza (Gerente)' },

    // Impuestos
    { d: '2026-10-10', t: '16:00', type: 'egreso', cat: 'GAS-IMP', sub: 'Patente y Tasas Municipales', amt: 180.00, tax: 0.00, pay: 'transferencia', ref: 'MUN-PAT-10', desc: 'Pago patente de comercio y actividad económica', usr: 'Lic. Valentina Soto (Contadora)' },
    { d: '2026-10-14', t: '15:30', type: 'egreso', cat: 'GAS-IMP', sub: 'IVA Declaración Mensual', amt: 420.00, tax: 0.00, pay: 'transferencia', ref: 'SAT-IVA-99', desc: 'Liquidación periodo fiscal anterior', usr: 'Lic. Valentina Soto (Contadora)' },

    // Ingreso Evento Especial
    { d: '2026-10-12', t: '22:30', type: 'ingreso', cat: 'ING-EVENT', sub: 'Reserva de Salón para Banquetes', amt: 1450.00, tax: 174.00, pay: 'transferencia', ref: 'EVT-CUMP-09', desc: 'Celebración cumpleaños corporativo 35 comensales con menú completo', usr: 'Carlos Mendoza (Gerente)' },

    // Nómina quincenal
    { d: '2026-10-15', t: '18:00', type: 'egreso', cat: 'GAS-NOM', sub: 'Sueldos de Cocina', amt: 1350.00, tax: 0.00, pay: 'transferencia', ref: 'NOM-QUIN-01', desc: 'Adelanto 1ra quincena personal de cocina', usr: 'Carlos Mendoza (Gerente)' },
    { d: '2026-10-15', t: '18:30', type: 'egreso', cat: 'GAS-NOM', sub: 'Sueldos de Sala y Meseros', amt: 980.00, tax: 0.00, pay: 'transferencia', ref: 'NOM-QUIN-02', desc: 'Adelanto 1ra quincena meseros y barman', usr: 'Carlos Mendoza (Gerente)' },

    // Más ventas del mes
    { d: '2026-10-16', t: '14:10', type: 'ingreso', cat: 'ING-SALON', sub: 'Almuerzos y Menú Ejecutivo', amt: 410.00, tax: 49.20, pay: 'tarjeta_debito', ref: 'FAC-001045', desc: 'Consumos almuerzo salón', usr: 'Mateo Rivas (Caja Principal)' },
    { d: '2026-10-17', t: '21:40', type: 'ingreso', cat: 'ING-SALON', sub: 'Cenas y Carta Especial', amt: 680.00, tax: 81.60, pay: 'tarjeta_credito', ref: 'FAC-001046', desc: 'Ventas noche sábado salón lleno', usr: 'Mateo Rivas (Caja Principal)' },
    { d: '2026-10-18', t: '13:00', type: 'ingreso', cat: 'ING-DELIV', sub: 'Pedidos Telefónicos y WhatsApp', amt: 295.00, tax: 35.40, pay: 'pago_movil_zelle', ref: 'DEL-TEL-33', desc: '8 pedidos delivery para oficinas', usr: 'Mateo Rivas (Caja Principal)' },
    { d: '2026-10-19', t: '17:00', type: 'egreso', cat: 'GAS-OPR', sub: 'Desechables y Empaques Delivery', amt: 110.00, tax: 13.20, pay: 'efectivo', ref: 'FAC-EMP-102', desc: 'Cajas pizza, bowls para ensaladas y bolsas térmicas', usr: 'Mateo Rivas (Caja Principal)' },
    { d: '2026-10-20', t: '11:00', type: 'egreso', cat: 'GAS-MANT', sub: 'Mantenimiento de Cocina y Frío', amt: 175.00, tax: 21.00, pay: 'transferencia', ref: 'MNT-REF-05', desc: 'Mantenimiento preventivo motor de cámara frigorífica', usr: 'Carlos Mendoza (Gerente)' },
    { d: '2026-10-21', t: '14:30', type: 'ingreso', cat: 'ING-SALON', sub: 'Almuerzos y Menú Ejecutivo', amt: 390.00, tax: 46.80, pay: 'tarjeta_debito', ref: 'FAC-001047', desc: 'Servicio almuerzos ejecutivos', usr: 'Mateo Rivas (Caja Principal)' },
    { d: '2026-10-22', t: '21:15', type: 'ingreso', cat: 'ING-SALON', sub: 'Cenas y Carta Especial', amt: 530.00, tax: 63.60, pay: 'tarjeta_credito', ref: 'FAC-001048', desc: 'Servicio cena salón principal', usr: 'Mateo Rivas (Caja Principal)' },
    { d: '2026-10-23', t: '10:45', type: 'ingreso', cat: 'ING-SALON', sub: 'Cafetería y Postres', amt: 125.00, tax: 15.00, pay: 'efectivo', ref: 'FAC-001049', desc: 'Desayunos, café gourmet y medialunas', usr: 'Mateo Rivas (Caja Principal)' }
  ];

  // Fetch subcategories
  const subRows = db.exec('SELECT id, name, category_id FROM subcategories');
  const subMap: Record<string, { id: number; catId: number }> = {};
  if (subRows.length && subRows[0].values) {
    for (const val of subRows[0].values) {
      subMap[val[1] as string] = { id: val[0] as number, catId: val[2] as number };
    }
  }

  // Fetch category names
  const catNameRows = db.exec('SELECT id, name FROM categories');
  const catNames: Record<number, string> = {};
  if (catNameRows.length && catNameRows[0].values) {
    for (const val of catNameRows[0].values) {
      catNames[val[0] as number] = val[1] as string;
    }
  }

  for (const t of sampleTransactions) {
    const subInfo = subMap[t.sub];
    const catId = subInfo ? subInfo.catId : (catMap[t.cat] || 1);
    const catName = catNames[catId] || t.cat;
    const subId = subInfo ? subInfo.id : null;

    db.run(
      `INSERT INTO transactions (date, time, type, category_id, category_name, subcategory_id, subcategory_name, amount, tax_amount, payment_method, reference_number, description, user_id, user_name, closure_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.d, t.t, t.type, catId, catName, subId, t.sub, t.amt, t.tax, t.pay, t.ref, t.desc, 1, t.usr, null, `${t.d}T${t.t}:00Z`]
    );
  }

  // Preload one previous cash closure for September 2026
  db.run(`
    INSERT INTO cash_closures (period_type, period_label, start_date, end_date, total_income, total_expenses, net_balance, expected_cash, counted_cash, cash_difference, closed_by_user, closed_at, notes, status)
    VALUES ('mensual', 'Septiembre 2026', '2026-09-01', '2026-09-30', 9850.00, 6740.00, 3110.00, 1420.00, 1420.00, 0.00, 'Lic. Valentina Soto (Contadora)', '2026-09-30T23:59:00Z', 'Cierre mensual contable ordinario conforme y auditado.', 'cerrado');
  `);
}
