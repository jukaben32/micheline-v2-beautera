-- Seed del contenido de /sites/micheline (script de una sola vez, no migracion).
-- Copia real del hero, bento, ubicaciones y testimonios de index.html.

INSERT INTO public.websites (
  business_id, is_published, site_title, tagline, hero_title, hero_subtitle,
  hero_cta_label, primary_color, secondary_color, dark_color, bg_color,
  border_color, muted_color, font_choice, whatsapp_number, phone, social_instagram
) VALUES (
  '645fbc08-035a-4302-9fbe-9a4a21b9decd', true,
  'Micheline Nail Bar | Butera Edition',
  'Micheline Nail Bar & Beauty Lounge',
  'Arte & Belleza en cada detalle.',
  'La belleza es una forma de autocuidado. En Micheline, elevamos esa expresión personal al nivel de obra maestra.',
  'Empieza tu experiencia',
  '#C81361', '#C9A227', '#1B1113', '#FFFBF7', '#EFE2E6', '#8A7A7E',
  'playfair_plex', '8096277471', '8092465821', NULL
)
ON CONFLICT (business_id) DO UPDATE SET
  is_published = EXCLUDED.is_published,
  site_title = EXCLUDED.site_title,
  tagline = EXCLUDED.tagline,
  hero_title = EXCLUDED.hero_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  hero_cta_label = EXCLUDED.hero_cta_label,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  dark_color = EXCLUDED.dark_color,
  bg_color = EXCLUDED.bg_color,
  border_color = EXCLUDED.border_color,
  muted_color = EXCLUDED.muted_color,
  whatsapp_number = EXCLUDED.whatsapp_number,
  phone = EXCLUDED.phone;

DELETE FROM public.website_highlights WHERE business_id = '645fbc08-035a-4302-9fbe-9a4a21b9decd';
INSERT INTO public.website_highlights (business_id, sort_order, title, subtitle, description, badge_label, size) VALUES
('645fbc08-035a-4302-9fbe-9a4a21b9decd', 0, 'Nail Art Profesional', NULL, 'Manicure, pedicure, gel y las más finas acrílicas para manos que cuentan historias.', 'Exclusivo', 'lg'),
('645fbc08-035a-4302-9fbe-9a4a21b9decd', 1, 'Pedi Spa 4 Pasos', NULL, 'Exfoliación, hidratación profunda y relajación absoluta para tus pies.', NULL, 'md'),
('645fbc08-035a-4302-9fbe-9a4a21b9decd', 2, 'Peluquería', NULL, 'Estilo & Definición', NULL, 'sm'),
('645fbc08-035a-4302-9fbe-9a4a21b9decd', 3, 'Cera & Cuidado', NULL, NULL, NULL, 'sm');

DELETE FROM public.website_locations WHERE business_id = '645fbc08-035a-4302-9fbe-9a4a21b9decd';
INSERT INTO public.website_locations (business_id, sort_order, name, badge_label, schedule_weekday, schedule_sunday, phone, whatsapp, is_dark) VALUES
('645fbc08-035a-4302-9fbe-9a4a21b9decd', 0, 'San Pedro de Macorís', 'MAIN STUDIO', 'Lunes a Sábado: 07:00 — 23:00', 'Domingo: 07:00 — 22:00', '8092465821', NULL, true),
('645fbc08-035a-4302-9fbe-9a4a21b9decd', 1, 'Boca Chica', 'COASTAL STUDIO', 'Lunes a Sábado: 07:00 — 21:00', 'Domingo: 07:00 — 20:00', NULL, '8096277471', false);

DELETE FROM public.website_testimonials WHERE business_id = '645fbc08-035a-4302-9fbe-9a4a21b9decd';
INSERT INTO public.website_testimonials (business_id, sort_order, author_name, author_location, quote, rating) VALUES
('645fbc08-035a-4302-9fbe-9a4a21b9decd', 0, 'Valeria M.', 'San Pedro de Macorís', 'Cada visita se siente como un ritual, no una cita más. El detalle en cada diseño es impecable.', 5),
('645fbc08-035a-4302-9fbe-9a4a21b9decd', 1, 'Camila R.', 'Boca Chica', 'El equipo es sumamente profesional. Reservar por WhatsApp es súper fácil y siempre puntuales.', 5),
('645fbc08-035a-4302-9fbe-9a4a21b9decd', 2, 'Daniela P.', 'San Pedro de Macorís', 'Elegancia pura desde que entras. Es mi lugar favorito para consentirme una vez al mes.', 5);
