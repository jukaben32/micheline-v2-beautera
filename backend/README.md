# Backend de Micheline Nail Bar

Funciones Edge de Supabase que alimentan la landing, el widget de reserva, el dashboard admin y el bot de WhatsApp.

## Funciones (carpetas)

- `get-availability/` — devuelve los huecos libres por estilista y fecha (usa timezone UTC-4, Santo Domingo). Usada por el widget.
- `create-booking/` — crea una cita en estado `pendiente_pago` (se confirma al pagar) y guarda el `price` del servicio. Envía email de confirmación solo cuando la cita pasa a `confirmada` (vía webhook o admin).
- `send-reminders/` — envía recordatorios de citas 24h antes (y reactivación). Se configura como cron en Supabase.
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

## Despliegue
Cada carpeta se despliega con:
```
supabase functions deploy <nombre> --project-ref kpszlnymywgudutqlgqa
```
