# Estado del proyecto Micheline

> Resumen de continuidad. Última actualización: sesión de construcción multi-tenant + alta de cliente.
> Para retomar: "continuemos Micheline" o "lee MICHELINE-ESTADO.md".

## 🎯 MISIÓN / VISIÓN DE ESCALA (lo más importante)
Micheline NO es el producto, es el PRIMER proyecto de una plataforma SaaS que el usuario
va a replicar decenas de veces. La misión es tener **decenas de proyectos como este funcionando
en el futuro cercano** (2do, 3er, 4to... cliente seguidos). Por tanto: TODO lo que se construya
debe quedar preparado para escalar desde el día 1 (multi-tenant real, monitoreo, operaciones 24/7).

Objetivo a mediano plazo: Hermes corriendo en un VPS con gateway + cron, monitoreando y dando
soporte a todos los clientes a la vez (el usuario no puede vigilar 30 negocios solo).

Para eso, dejar sembradas estas bases (baratas hoy, imprescindibles mañana):
- Fase 1.E: aislar widget/landing por `business_id` (previo a cliente 2).
- Enriquecer tabla `business` con `owner_email`, `owner_phone`, `domain`, `plan`, `status`
  (para que Hermes sepa a quién escribir y el estado de cada cliente).
- Dashboard de operaciones (vista super_admin con estado de TODOS los clientes).
- Motor de monitoreo (cron) cuando haya ~5 clientes reales.
- VPS + gateway 24/7 cuando se quiera soporte continuo.

NO sobre-ingeniería hoy (KISS), pero SÍ dejar el modelo de datos listo para decenas de tenants.

## Qué es
SaaS de reservas para salones de uñas. Usuario = dev principiante, explica paso a paso en español,
código comentado, simple>complejo, commit+push proactivo, verificar con pruebas reales (NO asumir).

## Stack
- Landing estática: `micheline-v2-beautera` (Vercel `w72i`) — repo `jukaben32/micheline-v2-beautera`.
- Dashboard Next.js: `micheline-dashboard` — repo `jukaben32/micheline-dashboard`.
  Producción: https://micheline-dashboard.vercel.app (último commit `7a57049`).
- Backend: Supabase `kpszlnymywgudutqlgqa` (URL https://kpszlnymywgudutqlgqa.supabase.co).
- Deploy funciones: `supabase functions deploy NOMBRE --project-ref kpszlnymywgudutqlgqa --no-verify-jwt`.
- DDL/SQL: vía Management API `POST /v1/projects/kpszlnymywgudutqlgqa/database/query` con token `sbp_`
  (NO usar `supabase db execute`; usar archivo con ruta Windows `C:/...` no MSYS).

## Estado actual (TODO VERIFICADO y en producción)
- Multi-tenant COMPLETO (Fase 1.A–D):
  - Tabla `business` (id `645fbc08-035a-4302-9fbe-9a4a21b9decd` = "Micheline Nail Bar" es el tenant ejemplo).
  - Tabla `profiles` (id = auth.users, role, business_id) + trigger `handle_new_user`.
  - `super_admin` = `jcbjm03@gmail.com` (ve todo). admin Micheline = `admin@micheline.com`.
  - RLS por `business_id`: admin ve su negocio, super_admin ve todo, landing(anon) ve solo
    Micheline + is_active. Funciones `is_super_admin` / `current_business_id` / `public_business_id`
    DEBEN ser `SECURITY DEFINER` (si no → recursión RLS 54001).
  - Dashboard: hook `useBusiness` + `BusinessSwitcher` (selector de negocio solo para super_admin).
  - Página `/alta-cliente` (solo super_admin): crea negocio + usuario Auth + perfil admin.
    Nota: el trigger ya crea el perfil vacío → la página hace UPDATE (no INSERT) al asignar business_id.
- Camino B: `send-confirmation` manda email al estilista asignado + botón WhatsApp a la dueña.
  Resend key en secret `RESEND_API_KEY`; remitente `onboarding@resend.dev`
  (dominio `micheline.com` NO verificado → usar `delivered@resend.dev` en pruebas).

## PENDIENTE (orden sugerido)
1. **Fase 1.E — aislar widget/landing por `business_id`** (ACORDADA, hacer ANTES del primer cliente real).
   Hoy widget/landing leen con anon key solo `is_active=true` sin `business_id` → al dar alta
   "Salón X" se mezclarían datos de Micheline y del nuevo. Fix: pasar `business_id` al script
   embebido (`data-business` o param URL) y filtrar consultas + ajustar policy `public_read`
   de `public_business_id()` a parámetro. El widget está en
   `backend/supabase/functions/widget/micheline-widget.html` + `micheline-widget.js` (Storage bucket `widget`).
   La función `chat` usa service_role y le pasa servicios/estilistas a Claude como contexto.
2. **Dominio propio en Resend**: usuario debe buscar/comprar dominio y verificarlo en Resend.
   Guía paso a paso en `backend/CONFIGURAR-DOMINIO-RESEND.md`.
3. Dar de alta el primer cliente real (ya existe la página `/alta-cliente`).

## Credenciales (las tengo en la sesión; rotar al cerrar)
- Supabase anon / service_role / `sbp_` las tengo.
- Resend key está en secret de Supabase (no hardcodeada en código).
- Vercel token `vcp_72kG...` válido para redeploy.
- GitHub push funciona con `ghp_gJKc...`. El fine-grained `github_pat_11BP6...` dio 403 (no usarlo).

## Arquitectura de archivos clave
- Landing dinámica: `micheline-v2-beautera/index.html` (funciones `loadHomeData`, `renderStylists`, etc).
- Dashboard estilistas: `src/app/estilistas/page.tsx` (sube foto a bucket `stylists`, campos email/whatsapp).
- Funciones Edge: `backend/supabase/functions/{create-booking,get-availability,send-confirmation,chat,whatsapp-bot,widget}`.
- Migraciones SQL en `micheline-dashboard/supabase/`: `005` profiles, `006` business_id, `007` RLS,
  `008` perfiles super_admin, `009` fix recursión SECURITY DEFINER.

## Reglas de verificación (exigidas por el usuario)
- Antes de decir "listo": demostrar el flujo completo (curl probes INSERT/SELECT/DELETE + navegador
  login/clicks), no asumir por leer código.
- Build del dashboard: `npm run build` con `.env.local` temporal (placeholders) y borrarlo después.
