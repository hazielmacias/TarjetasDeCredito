# Nuestras Finanzas

App web PWA mobile-first para que tú y tu pareja registren tarjetas de crédito, pagos y gastos en un solo lugar.

## Estado del proyecto

- ✅ Schema de DB aplicado
- ✅ Edge Function `join-room` desplegada
- ✅ Edge Function `send-reminders` desplegada (Web Push nativo, sin dependencias externas)
- ✅ Cron job programado (todos los días 9:00 AM México)
- ⚠️ **Pendiente manual**: Configurar 2 secretos y habilitar auth anónima en Supabase

## Pasos pendientes para terminar la configuración

### 1. Habilitar autenticación anónima

Ve a tu proyecto en [supabase.com](https://supabase.com):
- **Authentication** → **Providers** → **Anonymous** → Activar

### 2. Configurar secretos de las Edge Functions

Ve a **Edge Functions** → **Secrets** (o `Project Settings` → `Edge Functions` → `Secrets`) y agrega:

| Nombre | Valor |
|--------|-------|
| `VAPID_PUBLIC_KEY` | `1Jg4S3qkUIuzaHpATQQIPFveBtdX8ilXxxoSlguQnLQ_xxOEmM6YNYXQDgh54nER71-itowsL7xZk2GG8IyiIEI` |
| `VAPID_PRIVATE_KEY` | `kLwmWJxK4oUY1Yt-NzpWZoilQKoffvVycCgPH1LlguE` |
| `VAPID_SUBJECT` | `mailto:tu@email.com` (cámbialo por tu email real) |

### 3. Desplegar el frontend

Una PWA estática necesita hosting + HTTPS. Opciones:

**Opción rápida — Local (probar en tu celular):**
```bash
cd C:\Users\hazie\Desktop\HazielProyectos
npx serve -l 5000
```
Abre `http://tu-ip-local:5000` desde el celular (ambos dispositivos en la misma WiFi).
Luego, en el celular: **Agregar a pantalla de inicio** para instalar como app.

**Opción producción — Vercel (gratis + HTTPS):**
```bash
npm i -g vercel
cd C:\Users\hazie\Desktop\HazielProyectos
vercel deploy
```

**Opción GitHub Pages:** sube el repo a GitHub y habilita Pages en `main` branch.

> HTTPS es **obligatorio** para que el service worker y las notificaciones push funcionen.

## Cómo usar la app

1. Abre la URL en el celular de ambos.
2. Toca **Entrar** — usa el código `1234`.
3. El primer dispositivo crea la sala; el segundo se une automáticamente.
4. **Tarjetas** → Agrega tus tarjetas (nombre, banco, límite, día de corte, día de pago).
5. **Botón azul flotante** → Agregar gasto (monto, dónde, categoría, método, tarjeta).
6. **Tarjetas** → Toca una para ver detalles y registrar pagos.
7. **Ajustes** → Activa notificaciones push.
8. **Historial** → Cambia mes/año para ver meses anteriores.

## Estructura del proyecto

```
HazielProyectos/
├── index.html               # Entry HTML
├── manifest.json            # PWA manifest
├── service-worker.js        # SW + Web Push handler
├── css/styles.css           # Tokens Notion + utilidades
├── js/
│   ├── app.js               # Boot + rutas
│   ├── config.js            # Credenciales + VAPID public
│   ├── router.js            # Hash router
│   ├── store.js             # Estado global reactivo
│   ├── supabase.js          # Cliente Supabase + auth anónima
│   ├── api/
│   │   ├── rooms.js         # joinOrCreateRoom + realtime
│   │   ├── cards.js         # CRUD tarjetas
│   │   ├── payments.js      # CRUD pagos
│   │   ├── expenses.js      # CRUD gastos
│   │   ├── categories.js    # CRUD categorías
│   │   ├── push.js          # Suscripción Web Push
│   │   └── sync.js          # Refresh + watchRoom
│   ├── components/
│   │   ├── bottom-nav.js
│   │   ├── card-item.js
│   │   ├── expense-item.js
│   │   └── kpi-card.js
│   ├── views/
│   │   ├── welcome.js       # Onboarding + código 1234
│   │   ├── home.js          # Dashboard con KPIs
│   │   ├── cards.js         # CRUD tarjetas + detalle
│   │   ├── expenses.js      # Lista + formulario nuevo
│   │   ├── payments.js      # Lista + formulario nuevo
│   │   ├── categories.js    # CRUD categorías
│   │   ├── settings.js      # Sala + notificaciones + logout
│   │   └── history.js       # Meses anteriores
│   └── utils/
│       ├── format.js        # mxn(), fechaCorta(), proximaFechaPorDia()
│       └── ui.js            # toast(), modal(), confirm()
├── assets/icons/            # PWA icons (192, 512)
└── supabase/
    ├── migrations/          # SQL schema
    └── functions/           # join-room + send-reminders
```

## Arquitectura

- **Frontend**: HTML + Vanilla JS (ES modules) + Tailwind CSS (CDN) + tokens custom
- **Backend**: Supabase (Postgres + Realtime + Edge Functions)
- **Auth**: Anónima (sin email/password) con RLS policies por room
- **Sincronización**: Supabase Realtime — cambios en una sesión se reflejan al instante en la otra
- **Notificaciones**: Web Push Protocol (RFC 8030) nativo, sin librerías externas
- **Diseño**: Mobile-first, estilo Notion warm paper (`DESIGN.MD`)

## Seguridad

- Las tablas tienen **RLS habilitado** con policies que filtran por `room_id` del usuario.
- Cada dispositivo es un usuario anónimo de Supabase con `auth.uid()`.
- Un usuario solo ve/modifica datos de su propia sala.
- El código compartido `1234` es la única barrera de entrada. **Cámbialo a algo más seguro** en producción (ver siguiente sección).

## Cambiar el código compartido

El código está hardcoded en `js/config.js`:
```js
const ROOM_ACCESS_CODE = '1234';
```

Para cambiarlo:
1. Edita `js/config.js` con el nuevo código.
2. Redespliega el frontend.
3. Ambos dispositivos deben usar el nuevo código.

## Roadmap de mejoras futuras

- [ ] Editar gastos desde la lista
- [ ] Gráficas de gastos por categoría
- [ ] Exportar a CSV
- [ ] Tema oscuro
- [ ] Cambiar código desde Ajustes
- [ ] Adjuntar fotos de tickets
- [ ] Presupuestos mensuales
