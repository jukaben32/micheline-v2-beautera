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
