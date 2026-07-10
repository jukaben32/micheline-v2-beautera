# Backend de Micheline Nail Bar

Funciones Edge de Supabase que alimentan la landing, el widget de reserva, el dashboard admin y el bot de WhatsApp.

## Funciones (carpetas)

- `get-availability/` — devuelve los huecos libres por estilista y fecha (usa timezone UTC-4, Santo Domingo). Usada por el widget.
- `create-booking/` — crea una cita real en la BD (servicio + estilista + fecha + hora + cliente) y envía email de confirmación con Resend. Guarda `price` y `service_product_line_id` si vienen del widget.
- `send-reminders/` — envía recordatorios de citas 24h antes (y reactivación). Se configura como cron en Supabase.
- `chat/` — asistente de info: responde servicios y precios reales desde la BD.
- `whatsapp-bot/` — recibe mensajes de Meta WhatsApp y responde como "Micheline". (Pendiente: agendación inteligente tras verificar número y credenciales de Meta).

## Tablas (schema.sql / seed.sql / rls.sql)
- `servicios`, `estilistas`, `availability`, `bloqueos`, `business` — públicas (el widget las lee).
- `appointments`, `clients` — protegidas (solo service_role).
- `brands`, `service_product_lines` — marcas/líneas de producto que ajustan el precio.

## Despliegue
Cada carpeta se despliega con:
```
supabase functions deploy <nombre> --project-ref kpszlnymywgudutqlgqa
```
