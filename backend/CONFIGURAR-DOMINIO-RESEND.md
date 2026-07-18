# Configurar dominio propio en Resend (para emails de producción)

Mientras el dominio NO esté verificado, las funciones envían desde `onboarding@resend.dev`
(dominio de pruebas de Resend). En ese modo SOLO se puede enviar al email de tu propia
cuenta de Resend. Para enviar a clientes reales, hay que verificar tu dominio.

## Pasos (cuando tengas tu dominio activo)

1. Entra a https://resend.com/domains y pulsa **Add Domain**.
2. Escribe tu dominio (ej. `michelinenailbar.com`).
3. Resend te dará varios registros DNS (tipo **TXT**, **MX**, **CNAME** para SPF/DKIM).
4. Entra al panel de tu proveedor de dominio (donde lo compraste) y agrega esos registros
   DNS exactamente como los muestra Resend.
5. Vuelve a Resend y pulsa **Verify**. Puede tardar de minutos a unas horas (propagación DNS).
6. Cuando aparezca **Verified** ✅, avísame.

## Qué cambio yo cuando esté verificado

En estas 2 funciones, cambiar el remitente de `onboarding@resend.dev` a tu dominio:

- `backend/supabase/functions/send-confirmation/index.ts` → constante `FROM_EMAIL`
- `backend/supabase/functions/create-booking/index.ts` → campo `from`

Ejemplo: `'Micheline Nail Bar <no-reply@michelinenailbar.com>'`

Luego redesplegar:
```
supabase functions deploy send-confirmation --project-ref kpszlnymywgudutqlgqa --no-verify-jwt
supabase functions deploy create-booking   --project-ref kpszlnymywgudutqlgqa --no-verify-jwt
```

## Notas

- La API key de Resend NO va en el código. Está guardada como secret de Supabase:
  `supabase secrets set RESEND_API_KEY=...`
- Para rotar la key: repetir ese comando con la key nueva y redesplegar no hace falta
  (las funciones leen el secret en cada ejecución).
