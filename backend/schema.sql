-- ============================================================
-- ESQUEMA REAL de la base de datos (documentación, no ejecutable)
-- ============================================================
-- Generado el 2026-08-26 consultando directamente information_schema
-- en producción (proyecto kpszlnymywgudutqlgqa), porque la versión
-- anterior de este archivo estaba desactualizada (le faltaban brands,
-- products, service_product_lines, profiles, reminder_log,
-- rate_limit_log, business_id en cada tabla, y las columnas de pagos).
--
-- Este archivo es SOLO REFERENCIA de qué columnas existen hoy. No lo
-- ejecutes contra la base real: no incluye las políticas RLS (esas
-- viven en micheline-dashboard/supabase/*.sql, que es la fuente de
-- verdad — en particular 007, 010, 013, 014, 015 y 016) ni los valores
-- por default de business_id que ya trae cada tabla en producción.
--
-- Los archivos rls.sql y setup.sql que existían antes en esta carpeta
-- se BORRARON: recreaban políticas públicas inseguras
-- (USING (true) sobre business/blocked_slots/etc.) de cuando el
-- proyecto era de un solo negocio, previas al multi-tenant. Volver a
-- correrlos reabriría agujeros de seguridad ya corregidos.

-- 1. NEGOCIOS (multi-tenant: un negocio por cliente del dashboard)
CREATE TABLE business (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL DEFAULT 'Micheline Nail Bar',
  phone       text,
  email       text,
  address     text,
  timezone    text DEFAULT 'America/Santo_Domingo',
  created_at  timestamptz DEFAULT now(),
  bank_name   text,   -- datos bancarios para pago por transferencia (ver 013_business_bank.sql)
  bank_holder text,
  bank_account text
);

-- 2. PERFILES (rol y negocio de cada usuario de Supabase Auth)
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin','staff')),
  business_id uuid REFERENCES business(id) ON DELETE SET NULL,
  full_name   text,
  created_at  timestamptz DEFAULT now()
);

-- 3. ESTILISTAS
CREATE TABLE stylists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text NOT NULL,
  photo_url   text,
  bio         text,
  specialty   text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  email       text,
  whatsapp    text,
  business_id uuid NOT NULL REFERENCES business(id)
);

-- 4. CLIENTES (CRM básico)
CREATE TABLE clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text NOT NULL,
  phone       text,
  email       text,
  birth_date  date,
  notes       text,
  category    text DEFAULT 'nuevo' CHECK (category IN ('nuevo','frecuente','vip','inactivo')),
  created_at  timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES business(id)
);

-- 5. MARCAS (para líneas de producto de cada servicio)
CREATE TABLE brands (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES business(id)
);

-- 6. PRODUCTOS (catálogo, con costo y stock)
CREATE TABLE products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text,
  description text,
  brand       text,
  price       numeric(10,2) NOT NULL DEFAULT 0,
  cost        numeric(10,2) DEFAULT 0,
  stock       integer DEFAULT 0,
  sku         text,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  business_id uuid NOT NULL REFERENCES business(id)
);

-- 7. SERVICIOS (catálogo)
CREATE TABLE services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  duration_min  integer NOT NULL DEFAULT 60,
  price         numeric(10,2) NOT NULL DEFAULT 0,
  category      text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  business_id   uuid NOT NULL REFERENCES business(id)
);

-- 8. LÍNEAS SERVICIO x MARCA (ajuste de precio por combinación)
CREATE TABLE service_product_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      uuid REFERENCES services(id),
  brand_id        uuid REFERENCES brands(id),
  price_adjustment numeric(10,2) DEFAULT 0,
  is_default      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  business_id     uuid NOT NULL REFERENCES business(id)
);

-- 9. DISPONIBILIDAD SEMANAL (horario base de cada estilista)
CREATE TABLE availability (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id  uuid REFERENCES stylists(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  business_id uuid NOT NULL REFERENCES business(id),
  UNIQUE (stylist_id, day_of_week)
);

-- 10. BLOQUEOS (descansos, feriados, mantenimiento)
CREATE TABLE blocked_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id  uuid REFERENCES stylists(id) ON DELETE CASCADE,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz NOT NULL,
  reason      text,
  business_id uuid NOT NULL REFERENCES business(id)
);

-- 11. CITAS (core del sistema, incluye estado de pago)
CREATE TABLE appointments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                uuid REFERENCES clients(id) ON DELETE SET NULL,
  stylist_id               uuid REFERENCES stylists(id) ON DELETE CASCADE,
  service_id               uuid REFERENCES services(id) ON DELETE SET NULL,
  start_at                 timestamptz NOT NULL,
  end_at                   timestamptz NOT NULL,
  status                   text DEFAULT 'confirmada' CHECK (status IN ('confirmada','cancelada','reprogramada','completada','pendiente_pago')),
  client_name              text,
  client_phone             text,
  notes                    text,
  source                   text DEFAULT 'widget' CHECK (source IN ('widget','whatsapp','manual')),
  created_at               timestamptz DEFAULT now(),
  price                    numeric(10,2),
  service_product_line_id  uuid REFERENCES service_product_lines(id),
  business_id              uuid NOT NULL REFERENCES business(id),
  payment_method           text,
  payment_id               text,
  paid_at                  timestamptz
);

CREATE INDEX idx_appointments_stylist_start ON appointments(stylist_id, start_at);
CREATE INDEX idx_appointments_start ON appointments(start_at);

-- 12. BITÁCORA DE RECORDATORIOS (anti-duplicado, ver 014_reminder_log.sql)
CREATE TABLE reminder_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  client_id      uuid REFERENCES clients(id) ON DELETE CASCADE,
  tipo           text NOT NULL,
  canal          text NOT NULL DEFAULT 'whatsapp',
  enviado_en     timestamptz DEFAULT now(),
  UNIQUE (appointment_id, tipo)
);

-- 13. RATE LIMITING de Edge Functions públicas (ver 016_rate_limit_log.sql)
CREATE TABLE rate_limit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fn         text NOT NULL,
  rate_key   text NOT NULL,
  created_at timestamptz DEFAULT now()
);
