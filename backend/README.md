# Backend de Micheline Nail Bar

Funciones Edge de Supabase que alimentan la landing, el widget de reserva, el dashboard admin y el bot de WhatsApp.

## Funciones (carpetas)

- `get-availability/` — devuelve los huecos libres por estilista y fecha (usa timezone UTC-4, Santo Domingo). Usada por el widget.
- `create-booking/` — crea una cita en estado `pendiente_pago` (se confirma al pagar) y guarda el `price` del servicio. Envía email de confirmación solo cuando la cita pasa a `confirmada` (vía webhook o admin).
- `send-reminders/` — envía recordatorios automáticos (corre con cron de Supabase 1×/día):
  1. **24h antes** de la cita confirmada (recordatorio principal).
  2. **2h antes** de la cita confirmada (toque de atención).
  3. **Reactivación a 3 meses** sin visita (calcula la última cita confirmada por cliente; si pasaron >90 días, avisa).
  - Canales: WhatsApp (link wa.me) + Email (Resend si hay API key).
  - Bitácora `reminder_log` evita enviar 2 veces si el cron corre más de una vez.
  - Solo avisa citas `confirmada` (ignora `pendiente_pago` sin pagar).
- `chat/` — asistente de info: responde servicios y precios reales desde la BD.
- `whatsapp-bot/` — recibe mensajes de Meta WhatsApp y responde como "Micheline". (Pendiente: agendación inteligente tras verificar número y credenciales de Meta).

## Tablas (schema.sql / seed.sql / rls.sql)
- `servicios`, `estilistas`, `availability`, `bloqueos`, `business` — públicas (el widget las lee).
- `appointments`, `clients` — protegidas (solo service_role).
- `brands`, `service_product_lines` — marcas/líneas de producto que ajustan el precio.

- `create-payment/` — genera el **Link de Pago de CardNET** (redirige al cliente a la página de CardNET, nosotros no tocamos la tarjeta → PCI safe) o devuelve los **datos bancarios de transferencia** del salón. Lee `CARDNET_MERCHANT_ID` / `CARDNET_API_KEY` de los secretos de Supabase.
- `cardnet-webhook/` — CardNET lo llama al confirmar el pago; pasa la cita de `pendiente_pago` → `confirmada` y dispara el email de confirmación.

## Arquitectura de pagos (CardNET + transferencia)

Flujo: cliente reserva → `create-booking` crea cita `pendiente_pago` → elige método en el widget →
`create-payment` genera Link de Pago CardNET (o muestra datos de transferencia) → al pagar,
`cardnet-webhook` confirma la cita. Transferencia: el admin confirma manualmente desde el dashboard
(botón "Confirmar pago" en `pendiente_pago`).

## ✅ Pendientes para activar pagos en producción

> Estado: arquitectura COMPLETA y VERIFICADA (probes reales contra la BD). Falta configuración del lado del negocio.

1. **Credenciales de CardNET** (Merchant ID + API Key) → guardar como secretos en Supabase:
   ```
   supabase secrets set CARDNET_MERCHANT_ID=... CARDNET_API_KEY=...
   ```
   Sin esto, `create-payment` con tarjeta devuelve "CardNET no configurado" (la transferencia SÍ funciona).
2. **Datos bancarios de Micheline** en la tabla `business` (columnas ya creadas: `bank_name`, `bank_holder`, `bank_account`) → para que la opción de transferencia muestre los datos reales. Hoy están en `null`.
3. **Desplegar las nuevas Edge Functions** en Supabase:
   ```
   supabase functions deploy create-payment --project-ref kpszlnymywgudutqlgqa
   supabase functions deploy cardnet-webhook --project-ref kpszlnymywgudutqlgqa
   ```
4. **Verificar URL/endpoint exacto de CardNET** (Link de Pago) con su documentación oficial → el endpoint en `create-payment` quedó con la ruta estándar `https://server.pciapi.cardnet.com.do/payment-request` pero puede variar según la doc real.

## ✅ Pendientes para activar RECORDATORIOS automáticos

> Estado: función `send-reminders` REESCRITA y VERIFICADA (probe real: detectó 1 cita confirmada para mañana + tabla `reminder_log` OK). Falta desplegar + crear el cron.

5. **Desplegar `send-reminders`** (la versión nueva con 24h/2h/reactivación 3m):
   ```
   supabase functions deploy send-reminders --project-ref kpszlnymywgudutqlgqa
   ```
6. **Crear el cron en Supabase** (1×/día, ej. 9:00 AM Santo Domingo) que invoque la función:
   ```sql
   -- En el SQL editor de Supabase:
   select cron.schedule('recordatorios-diarios', '0 13 * * *',
     $$ select net.http_post(
         url:='https://kpszlnymywgudutqlgqa.supabase.co/functions/v1/send-reminders',
         headers:='{"Authorization":"Bearer <ANON_KEY>"}'::jsonb) $$);
   ```
   (13:00 UTC = 9:00 AM Santo Domingo. Ajustar si cambia el horario de verano.)
7. **WhatsApp real**: hoy el recordatorio genera el link `wa.me` pero NO lo envía solo. Para envío automático por WhatsApp hay que integrar la API de Meta (mismo pendiente del `whatsapp-bot`). Mientras tanto, el email (Resend) sí sale si hay `RESEND_API_KEY` y el cliente tiene email.

## Despliegue
Cada carpeta se despliega con:
```
supabase functions deploy <nombre> --project-ref kpszlnymywgudutqlgqa
```
