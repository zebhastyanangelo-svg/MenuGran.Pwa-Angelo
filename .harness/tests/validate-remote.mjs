import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const envPath = join(dirname(fileURLToPath(import.meta.url)), '../../.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;

const admin = createClient(URL, ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { apikey: ANON } },
});

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
}

const R = (n) => Math.random().toString(36).slice(2, 8);
const ownerEmail = `owner-${R(4)}@menugram.test`;
const customerEmail = `customer-${R(4)}@menugram.test`;
const PASS = 'Test123456!';

// 1) signUp owner (autoconfirm habilitado)
let { data, error } = await admin.auth.signUp({ email: ownerEmail, password: PASS });
check('signUp owner (autoconfirm)', !!data.user && !error, data.user?.id ?? error?.message);

// 2) perfil auto-creado por trigger handle_new_user
let { data: profile } = await admin
  .from('profiles')
  .select('id, email, role')
  .eq('id', data.user.id)
  .single();
check('trigger: profile auto-creado', !!profile && profile.email === ownerEmail, JSON.stringify(profile));

// 3) owner crea comercio (RLS merchants_insert_owner)
const { data: merchant, error: mErr } = await admin
  .from('merchants')
  .insert({ owner_id: data.user.id, name: 'Restaurante Demo', slug: `demo-${R(4)}`, location: '(-66.9,10.5)' })
  .select()
  .single();
check('owner inserta merchant', !!merchant && !mErr, mErr?.message ?? merchant?.id);

// 4) owner activa el comercio (merchants_update_owner)
const { error: updErr } = await admin
  .from('merchants')
  .update({ status: 'active', is_active: true })
  .eq('id', merchant.id);
check('owner activa merchant (status=active)', !updErr, updErr?.message ?? '');

// 5) categorías + productos
const { data: cat1 } = await admin
  .from('categories')
  .insert({ merchant_id: merchant.id, name: 'Platos', sort_order: 1 })
  .select()
  .single();
const { data: cat2 } = await admin
  .from('categories')
  .insert({ merchant_id: merchant.id, name: 'Bebidas', sort_order: 2 })
  .select()
  .single();
const { data: product, error: pErr } = await admin
  .from('products')
  .insert({ merchant_id: merchant.id, category_id: cat1.id, title: 'Arepa Reina', price: 8.5 })
  .select()
  .single();
check('owner inserta categorias+producto', !!cat1 && !!cat2 && !!product && !pErr, pErr?.message ?? product?.title);

// 6) signUp customer CON EL CLIENTE customer (para tener sesión real)
const customer = createClient(URL, ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { apikey: ANON } },
});
let { data: cData, error: cErr } = await customer.auth.signUp({ email: customerEmail, password: PASS });
check('signUp customer (autoconfirm)', !!cData.user && !cErr, cData.user?.id ?? cErr?.message);

// 7) catálogo público (mismos filtros que MarketplacePage)
const { data: catalog } = await customer
  .from('merchants')
  .select('id, name, slug, status, is_active')
  .eq('is_active', true)
  .eq('status', 'active');
check(
  'customer lee catalogo activo',
  Array.isArray(catalog) && catalog.length >= 1 && catalog.some((m) => m.id === merchant.id),
  JSON.stringify(catalog),
);

// 8) orden con el mismo payload de Checkout.tsx
const orderPayload = {
  merchant_id: merchant.id,
  customer_id: cData.user.id,
  type: 'delivery',
  status: 'payment_pending',
  payment_method: 'pago_movil',
  payment_reference: 'REF-2026-0001',
  payment_proof_url: '',
  total_amount: 8.5,
  table_number: null,
  delivery_location: '(-66.9,10.5)',
  delivery_address_notes: null,
  items: [{ product_id: product.id, quantity: 1, unit_price: 8.5, notes: null }],
};
const { data: order, error: oErr } = await customer
  .from('orders')
  .insert(orderPayload)
  .select()
  .single();
check('customer crea orden (payload Checkout)', !!order && !oErr, oErr?.message ?? order?.id);

// 9) owner lee las órdenes de su comercio
const { data: ownerOrders } = await admin
  .from('orders')
  .select('id, merchant_id, status')
  .eq('merchant_id', merchant.id);
check(
  'owner lee ordenes del comercio',
  Array.isArray(ownerOrders) && ownerOrders.length >= 1 && ownerOrders.every((o) => o.merchant_id === merchant.id),
  JSON.stringify(ownerOrders),
);

// 10) RLS negativos
const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: leaked } = await anon.from('profiles').select('*');
check('anon NO lee profiles', !leaked || leaked.length === 0, `rows=${leaked?.length}`);

const { error: neg1 } = await customer.from('merchants').insert({ owner_id: crypto.randomUUID(), name: 'Hack', slug: `hack-${R(4)}` });
check('customer NO inserta merchant ajeno', !!neg1, neg1?.message ?? 'se permitio!');

const { data: neg2Data, error: neg2 } = await customer
  .from('merchants')
  .update({ status: 'banned' })
  .eq('id', merchant.id)
  .select('status');
const stillActive = !neg2Data || neg2Data.length === 0 || neg2Data[0].status === 'active';
check('customer NO actualiza merchant ajeno', !!neg2 || stillActive, neg2?.message ?? JSON.stringify(neg2Data));

const { data: otherOrders } = await customer.from('orders').select('id').neq('customer_id', cData.user.id);
check('customer NO lee ordenes de otros', !otherOrders || otherOrders.length === 0, `rows=${otherOrders?.length}`);

// 11) cleanup: usuarios creados solo en auth (datos semilla en public quedan para la demo)
console.log('\n--- DATOS DE PRUEBA (mantener para demo local) ---');
console.log('MERCHANT_ID:', merchant.id);
console.log('OWNER:', ownerEmail, '/', PASS);
console.log('CUSTOMER:', customerEmail, '/', PASS);

const failed = results.filter((r) => !r.ok);
console.log(`\nRESULTADO: ${results.length - failed.length}/${results.length} OK`);
process.exit(failed.length === 0 ? 0 : 1);
