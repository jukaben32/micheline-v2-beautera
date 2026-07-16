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
-- Insertar negocio
INSERT INTO business (name, phone, email, timezone)
SELECT 'Micheline Nail Bar', '8096277471', 'hola@micheline.com', 'America/Santo_Domingo'
WHERE NOT EXISTS (SELECT 1 FROM business);

-- Insertar estilista de ejemplo
INSERT INTO stylists (full_name, specialty, bio)
SELECT 'Micheline', 'Manicura & Arte en uñas', 'Fundadora y experta en nail art.'
WHERE NOT EXISTS (SELECT 1 FROM stylists);

-- Insertar servicios de ejemplo
INSERT INTO services (name, duration_min, price, category)
SELECT * FROM (VALUES
  ('Manicura clásica', 45, 25.00, 'Manos'),
  ('Manicura con gel', 60, 40.00, 'Manos'),
  ('Pedicura spa', 60, 35.00, 'Pies'),
  ('Nail art premium', 90, 60.00, 'Arte'),
  ('Retiro de esmalte en gel', 30, 15.00, 'Manos')
) AS v(name, duration_min, price, category)
WHERE NOT EXISTS (SELECT 1 FROM services);

-- Horario de la estilista (lunes a sábado 9:00-17:00)
INSERT INTO availability (stylist_id, day_of_week, start_time, end_time)
SELECT s.id, d, '09:00', '17:00'
FROM stylists s, unnest(array[1,2,3,4,5,6]) AS d
WHERE NOT EXISTS (SELECT 1 FROM availability WHERE stylist_id = s.id);
-- Politicas RLS para que el widget (rol anon) pueda LEER datos publicos
-- Las citas/clientes NO son publicas (solo el backend con service_role).

-- Servicios: lectura publica
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servicios_public_read" ON services FOR SELECT USING (true);

-- Estilistas: lectura publica
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stylists_public_read" ON stylists FOR SELECT USING (true);

-- Availability: lectura publica (para calcular huecos)
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "availability_public_read" ON availability FOR SELECT USING (true);

-- Blocked_slots: lectura publica
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocked_public_read" ON blocked_slots FOR SELECT USING (true);

-- Business: lectura publica
ALTER TABLE business ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_public_read" ON business FOR SELECT USING (true);

-- Appointments / clients: SIN politica de lectura anon (solo service_role via Edge Function)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
