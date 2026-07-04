-- ============================================================
-- INGENIO CV — Configuración inicial de Supabase
-- Copiá y pegá TODO este archivo en:
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---------- TABLAS ----------

create table if not exists products (
  id text primary key,
  name text not null,
  brand text not null,
  category text not null,
  price numeric not null default 0,
  quantity integer not null default 0,
  material text,
  description text,
  image1 text,
  image2 text,
  created_at timestamptz default now()
);

create table if not exists brands (
  name text primary key
);

create table if not exists categories (
  name text primary key
);

create table if not exists orders (
  id text primary key,
  created_at timestamptz default now(),
  order_date text,
  delivery_date text,
  customer jsonb,
  items jsonb,
  total numeric,
  status text default 'Pendiente'
);

-- Tabla genérica de configuración (teléfono del vendedor, PDF de forma de pago, etc.)
create table if not exists settings (
  key text primary key,
  value text
);

-- ---------- SEGURIDAD (Row Level Security) ----------

alter table products enable row level security;
alter table brands enable row level security;
alter table categories enable row level security;
alter table orders enable row level security;
alter table settings enable row level security;

-- Cualquiera puede LEER productos, marcas, categorías y configuración
-- (la tienda pública los necesita sin estar logueada)
create policy "public read products" on products for select using (true);
create policy "public read brands" on brands for select using (true);
create policy "public read categories" on categories for select using (true);
create policy "public read settings" on settings for select using (true);

-- Solo un usuario logueado (el admin) puede crear/editar/borrar
create policy "admin write products" on products for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write brands" on brands for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write categories" on categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin write settings" on settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Pedidos: cualquier cliente puede CREAR un pedido desde la tienda,
-- pero solo el admin logueado puede verlos, editarlos o borrarlos.
create policy "public insert orders" on orders for insert with check (true);
create policy "admin read orders" on orders for select using (auth.role() = 'authenticated');
create policy "admin update orders" on orders for update using (auth.role() = 'authenticated');
create policy "admin delete orders" on orders for delete using (auth.role() = 'authenticated');

-- ---------- STORAGE (imágenes de productos y PDF de forma de pago) ----------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-docs', 'payment-docs', true)
on conflict (id) do nothing;

create policy "public read product-images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "admin write product-images" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "admin update product-images" on storage.objects
  for update using (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "admin delete product-images" on storage.objects
  for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "public read payment-docs" on storage.objects
  for select using (bucket_id = 'payment-docs');
create policy "admin write payment-docs" on storage.objects
  for insert with check (bucket_id = 'payment-docs' and auth.role() = 'authenticated');
create policy "admin update payment-docs" on storage.objects
  for update using (bucket_id = 'payment-docs' and auth.role() = 'authenticated');
create policy "admin delete payment-docs" on storage.objects
  for delete using (bucket_id = 'payment-docs' and auth.role() = 'authenticated');

-- ---------- DATOS INICIALES (semilla, igual al catálogo actual) ----------

insert into brands (name) values
  ('John Deere'), ('Case IH'), ('New Holland'), ('Massey Ferguson'),
  ('Claas'), ('Valtra'), ('Genérico')
on conflict do nothing;

insert into categories (name) values
  ('Kits Completos'), ('Cosechadoras'), ('Seguridad'), ('Accesorios')
on conflict do nothing;

insert into settings (key, value) values
  ('vendor_phone', '54923200342399')
on conflict do nothing;

insert into products (id, name, brand, category, price, quantity, material, description, image1, image2) values
('jd-6125j', 'Kit de Calcomanías John Deere 6125J - Capot Completo', 'John Deere', 'Kits Completos', 38500, 4,
  'Vinilo premium vehicular, protección UV',
  'Kit completo de calcomanías de alta durabilidad para capot. Colores verde y amarillo idénticos a la pintura original. Resiste intemperie, lavado a presión y barro.',
  'assets/jd_decal_mockup.png', 'assets/brands_pack_mockup.png'),
('case-puma-200', 'Kit de Calcomanías Case IH Puma 200 - Capot Completo', 'Case IH', 'Kits Completos', 39900, 4,
  'Vinilo premium calandrado, laminado transparente protector',
  'Kit de franjas laterales e insignias modelo Puma 200 para tractores Case. Excelente adherencia en superficies curvas. Acabado brillante.',
  'assets/case_decal_mockup.png', 'assets/logo.png'),
('nh-cr990', 'Kit de Calcomanías Cosechadora New Holland CR 9.90', 'New Holland', 'Cosechadoras', 62000, 8,
  'Vinilo vehicular de alto rendimiento, tintas UV',
  'Kit premium completo para cosechadoras New Holland CR 9.90. Incluye franjas amarillas/azules y textos correspondientes. Calidad de fábrica.',
  'assets/nh_decal_mockup.png', 'assets/brands_pack_mockup.png'),
('mf-4283', 'Kit de Calcomanías Massey Ferguson 4283', 'Massey Ferguson', 'Kits Completos', 32000, 4,
  'Vinilo Oracal, corte de alta precisión',
  'Adhesivos de repuesto para tractores Massey Ferguson 4283. Corte exacto por computadora, listos con transfer para una fácil instalación.',
  'assets/mf_decal_mockup.png', 'assets/logo.png'),
('seguridad-reflejante', 'Kit Reglamentario Vial - Bandas Reflectivas y Velocidad Máxima 80', 'Genérico', 'Seguridad', 18500, 3,
  'Vinilo reflectivo Grado Ingeniería homologado por Vialidad',
  'Kit reglamentario para circular en rutas nacionales con maquinaria agrícola. Incluye bandas cebra reflectivas rojas y blancas y círculo indicador de velocidad máxima 80.',
  'assets/safety_decal_mockup.png', 'assets/logo.png'),
('logo-pack', 'Pack de Logos de Marcas Agrícolas (John Deere, Case, NH, MF, Claas)', 'Genérico', 'Accesorios', 9500, 10,
  'Vinilo autoadhesivo troquelado',
  'Pack surtido de calcomanías con los logos de las principales marcas del agro. Ideal para decorar herramientas, camionetas o el taller.',
  'assets/brands_pack_mockup.png', '')
on conflict (id) do nothing;
