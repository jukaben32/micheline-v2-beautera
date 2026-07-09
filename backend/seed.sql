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
