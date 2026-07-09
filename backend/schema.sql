-- 1. NEGOCIO (datos del salón)
CREATE TABLE IF NOT EXISTS business (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Micheline Nail Bar',
  phone text,
  email text,
  address text,
  timezone text DEFAULT 'America/Santo_Domingo',
  created_at timestamptz DEFAULT now()
);

-- 2. ESTILISTAS
CREATE TABLE IF NOT EXISTS stylists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  photo_url text,
  bio text,
  specialty text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. CLIENTES (CRM básico)
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text,
  birth_date date,
  notes text,
  category text DEFAULT 'nuevo' CHECK (category IN ('nuevo','frecuente','vip','inactivo')),
  created_at timestamptz DEFAULT now()
);

-- 4. SERVICIOS (catálogo)
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_min integer NOT NULL DEFAULT 60,
  price numeric(10,2) NOT NULL DEFAULT 0,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 5. DISPONIBILIDAD SEMANAL (horario base de cada estilista)
CREATE TABLE IF NOT EXISTS availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id uuid REFERENCES stylists(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  UNIQUE (stylist_id, day_of_week)
);

-- 6. BLOQUEOS (descansos, feriados, mantenimiento)
CREATE TABLE IF NOT EXISTS blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id uuid REFERENCES stylists(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text
);

-- 7. CITAS (core del sistema)
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  stylist_id uuid REFERENCES stylists(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text DEFAULT 'confirmada' CHECK (status IN ('confirmada','cancelada','reprogramada','completada')),
  client_name text,
  client_phone text,
  notes text,
  source text DEFAULT 'widget' CHECK (source IN ('widget','whatsapp','manual')),
  created_at timestamptz DEFAULT now()
);

-- Índices para velocidad
CREATE INDEX IF NOT EXISTS idx_appointments_stylist_start ON appointments(stylist_id, start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_at);
