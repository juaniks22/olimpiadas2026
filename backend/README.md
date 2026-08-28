<<<<<<< HEAD
# Blue Code — Backend API

Monolito modular en capas: **Controllers → Services → Repositories**.
Express 5 · Prisma 6 · PostgreSQL (Railway) · JWT · bcrypt.

## Puesta en marcha

```bash
npm install                 # ya hecho
npx prisma generate         # ya hecho (cliente en node_modules/@prisma/client)
npx prisma migrate deploy   # aplica migraciones (DATABASE_URL ya apunta a Railway)
npm run seed:admin          # crea la cuenta ADMIN única (usuario/clave del .env)
npm run dev                 # levanta la API con --watch en http://localhost:3000
```

Variables en `.env` (archivo oculto, `dir /a`): `DATABASE_URL`, `JWT_SECRET`,
`JWT_EXPIRES_IN=15m`, `PORT=3000`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.

Scripts: `npm start`, `npm run dev`, `npm run seed:admin`,
`node scripts/wipeTestData.js` (limpia datos de prueba, conserva el ADMIN),
`npm run prisma:studio`.

## Autenticación

- `Authorization: Bearer <token>` en cada request protegida.
- **Sesión deslizante**: cada respuesta autenticada trae un header **`X-Session-Token`**
  con un token nuevo (ventana de 15 min renovada). El cliente debe reemplazar el token
  guardado con ese valor en cada respuesta. Sin refresh token.
- Errores: `{ "error": { "message": "...", "details": ... } }`.

## Estructura

```
src/
  app.js  server.js
  config/       env.js  prisma.js
  middleware/   authenticate.js  authorize.js  errorHandler.js
  utils/        AppError.js  validate.js  password.js  token.js  csv.js  pdf.js
  modules/<m>/  <m>.routes.js  <m>.controller.js  <m>.service.js  <m>.repository.js
```

Los **Repositories** son lo único que importa Prisma; los **Services** nunca lo tocan.

## Endpoints

Roles: **A** = solo Admin · **A/G** = ambos · _(público)_.

### Auth `/auth`
| | | |
|---|---|---|
| POST | `/login` | _(público)_ → `{ token, user }` |
| GET | `/me` | A/G |
| POST | `/change-password` | A/G — `{ currentPassword, newPassword }` |

### Usuarios `/users` — **A**
`GET /` (`?isActive=`) · `GET /:id` · `POST /` (`{ username, password? , generatePassword? }`, rol forzado GENERIC) ·
`PATCH /:id` (`{ username }`) · `POST /:id/deactivate` · `POST /:id/reactivate` ·
`POST /:id/reset-password` (`{ password? , generatePassword? }`) · `POST /generate-password` (no persiste).
Si `generatePassword`, la respuesta incluye `generatedPassword` una sola vez.

### Áreas `/areas`
`GET /` · `GET /:id` (A/G) — `POST /` · `PATCH /:id` · `POST /:id/deactivate` (A).

### Llamados `/calls` — **inmutable** (solo POST/GET)
- `POST /` (A/G) — endpoint **transaccional**. Crea `Call` + `EventForm` (paciente embebido +
  cronología) + `defibrillations[]` + `drugsAdministered[]` + `teamAssignments[]` +
  `crashCartConsumptions[]`. Todo o nada. `createdByUserId` se toma del token.
  Si hay consumos, `eventForm.crashCartId` es obligatorio y el carro debe estar `IN_SERVICE`;
  cualquier consumo deja el **carro completo** `OUT_OF_SERVICE` y descuenta stock.
- `GET /` — GENERIC ve **solo lo propio** (filtro por autoría, en el Service).
  Admin ve todo con `?areaId=&type=&origin=&dateFrom=&dateTo=`.
- `GET /:id` — detalle anidado (GENERIC: 404 si no es suyo).

<details><summary>Body de ejemplo para <code>POST /calls</code></summary>

```json
{
  "type": "EMERGENCY",
  "origin": "INTRA_HOSPITAL",
  "areaId": "<uuid>",
  "eventForm": {
    "patientIdentificationType": "DNI",
    "patientDni": "40111222",
    "patientSex": "F", "patientAge": 68,
    "admissionDate": "2026-08-20T00:00:00Z",
    "timeSinceDiscoveryMinutes": 4,
    "callReceivedAt": "2026-08-27T14:00:00Z",
    "teamArrivalAt": "2026-08-27T14:03:30Z",
    "cprStartedAt": "2026-08-27T14:04:00Z",
    "returnOfSpontaneousCirculationAt": "2026-08-27T14:18:00Z",
    "eventEndedAt": "2026-08-27T14:25:00Z",
    "airwayManagement": "Intubación orotraqueal",
    "venousAccess": "Vía periférica x2",
    "postResuscitationStatus": "Estable, derivada a UTI",
    "suspensionCause": null,
    "crashCartId": "<uuid>"
  },
  "defibrillations": [
    { "sequenceNumber": 1, "performedAt": "2026-08-27T14:06:00Z", "energyDelivered": 200, "rhythm": "FV" }
  ],
  "drugsAdministered": [
    { "drugName": "Adrenalina", "dose": 1, "unit": "mg", "route": "IV", "administeredAt": "2026-08-27T14:07:00Z" }
  ],
  "teamAssignments": [
    { "positionId": "<uuid>", "staffMemberId": "<uuid>" }
  ],
  "crashCartConsumptions": [
    { "crashCartItemId": "<uuid>", "quantity": 2 }
  ]
}
```
</details>

### Equipo de respuesta
- `/response-team-positions` — `GET /` (A/G) · `POST /` · `PATCH /:id` (A).
- `/staff-members` — `GET /`, `GET /:id` (A/G, el Jefe de Piso los elige al cargar el llamado) ·
  `POST /` (`{ dni, name, role?, certifications? }`) · `PATCH /:id` (A).

### Carro de paro
**Catálogo estándar (global):**
- `/crash-cart-positions` — `GET /` (A/G) · `POST /` · `PATCH /:id` (A).
- `/crash-cart-items` — `GET /` (`?positionId=`, A/G) · `POST /` (`{ positionId, name, standardQuantity, unit? }`) · `PATCH /:id` (A).

**Instancias físicas:**
- `GET /crash-carts` (A/G) — nombre + estado.
- `GET /crash-carts/:id` (A/G) — composición/stock + historial de consumos.
- `POST /crash-carts` (A) — `{ name }`. Siembra el stock con el estándar vigente.
- `PATCH /crash-carts/:id` (A) — `{ name }`.
- `POST /crash-carts/:id/reactivate` (A) — sin payload; asume reposición total,
  resetea stock a estándar, pasa a `IN_SERVICE`.
- `GET /crash-carts/:id/consumptions` (A/G) — la "orden de restockeo".

> El consumo no tiene endpoint propio: se registra dentro de `POST /calls`.

### Reportes `/reports` — **A** (CP-6/7/8/9/14)
- `GET /summary` — totales, **tiempo promedio de respuesta** (de `teamArrivalAt − callReceivedAt`), % por tipo/origen.
- `GET /calls` — filas planas para tablas/gráficos (`?areaId=&origin=&type=&dateFrom=&dateTo=`).
- `GET /export/csv` — CSV sin librería (BOM UTF-8).
- `GET /export/pdf` — PDF simple de una página (resumen + primeras filas).
- `GET /crash-carts` — estado y stock de todos los carros + consumos por rango de fechas.

## Decisiones que se apartan del Documento de Visión

1. **Exportación PDF en el backend**: la visión la ubica en el frontend (jsPDF). El endpoint
   `/reports/export/pdf` existe igual y devuelve un PDF mínimo de una página; para el detalle
   completo se usa el CSV. Si se decide hacer el PDF 100% en el front, este endpoint queda como
   respaldo.
2. **Sesión deslizante vía header `X-Session-Token`**: forma concreta de implementar la
   "expiración por inactividad" de CP-15 sin refresh token.
=======
# Blue Code — Sistema de Gestión de Emergencias Médicas "Código Azul"

Este repositorio contiene el código fuente del prototipo **Blue Code**, un sistema integral diseñado para digitalizar, estructurar y auditar el ciclo de vida del registro de eventos de paro cardiorrespiratorio (PCR) en entornos hospitalarios de mediana y pequeña envergadura. El proyecto ha sido desarrollado como demo de referencia técnica para la Olimpiada de Programación 2026 (ONETP) por el equipo de la E.E.S.T. N°2 de Mar del Plata.

El sistema opera bajo un esquema de **carga posterior al evento**: el personal médico y de enfermería registra los datos clínicos y de consumos mediante una planilla estandarizada una vez resuelta la emergencia, eliminando la dependencia de flujos o notificaciones en tiempo real.

-----

## 🚀 Arquitectura y Stack Tecnológico

El proyecto está organizado en un formato de monorepo independiente:

  * **Backend:** Node.js con el framework Express.
  * **ORM y Base de Datos:** Prisma interconectado con PostgreSQL. El modelo de datos es completamente genérico y configurable por base de datos, lo que permite editar áreas, posiciones del carro de paro y posiciones del equipo de respuesta sin alterar el código fuente.
  * **Autenticación y Seguridad:** JSON Web Tokens (JWT) con expiración fija de 12 horas (sin refresh tokens). Cifrado de contraseñas mediante el algoritmo de hashing `bcrypt`.
  * **Frontend Web:** Panel de administración y gestión construido en React. Incorpora la librería Recharts para la visualización de métricas de auditoría en gráficos de barras, pastel y líneas.
  * **Exportación de Datos:** Generación de archivos PDF mediante la librería `jsPDF` y exportación nativa a formato CSV (construcción manual de strings a partir de datos estructurados).
  * **Aplicación Móvil:** Desarrollada en Flutter utilizando Riverpod para la gestión de estados. Permite la consulta síncrona del historial de llamados asignados y turnos del personal médico mediante peticiones HTTP REST tradicionales.

-----

## 🛠️ Convención de Nomenclatura del Código

Siguiendo las directrices del equipo, la documentación funcional del negocio se mantiene en español, pero **todas las entidades técnicas, archivos, variables, endpoints y tablas de la base de datos se implementan estrictamente en inglés**.

### Mapeo Canónico de Términos

| Término de Negocio (Español)                  | Nombre Técnico (Inglés)                      |
| :-------------------------------------------- | :------------------------------------------- |
| Llamado                                       | `call`                                       |
| Emergencia / Normal                           | `emergency` / `normal`                       |
| Origen intrahospitalario / extra hospitalario | `internal_origin` / `external_origin`        |
| Área / Zona hospitalaria                      | `area`                                       |
| Ficha de paciente / Paciente                  | `patient_record` / `patient`                 |
| Número provisorio / NN                        | `provisional_id` / `unknown_patient`         |
| Carro de paro / Consumibles / Consumo         | `crash_cart` / `supplies` / `consumption`    |
| Equipo de respuesta / Turno médico            | `response_team` / `shift`                    |
| Personal certificado                          | `certified_staff`                            |
| Formulario Utstein / Cronología               | `event_form` / `event_timeline`              |
| Retorno de circulación espontánea (RCE)       | `return_of_spontaneous_circulation` / `rosc` |
| Usuario Administrador / Usuario Genérico      | `admin_user` / `generic_user`                |
| Reporte de auditoría                          | `report`                                     |

-----

## 📋 Características Principales Implementadas (MVP)

1.  **CP-1 a CP-3 (Gestión Base):** Configuración dinámica de layouts hospitalarios (áreas), fichas clínicas adaptadas para pacientes NN o con identificador temporal, y control de accesos basado en roles (Administrador y Genérico).
2.  **CP-4 a CP-6 (Módulo Utstein):** Registro retrospectivo de llamados con discriminación de gravedad y origen, completando la cronología del evento, maniobras de desfibrilación (julios y descargas), manejo de vía aérea, accesos venosos y drogas administradas.
3.  **CP-12 y CP-13 (Estructuras Auxiliares):** Gestión de insumos del carro de paro por compartimentos y conformación de equipos de respuesta fijos por turnos médicos de 12 horas.
4.  **CP-7 a CP-9 (Auditoría):** Dashboard con visualización de tiempos promedio de respuesta y consumos de insumos, filtros avanzados y exportación a PDF/CSV.

-----

## ⚡ Estructura del Repositorio

El monorepo está organizado de la siguiente manera:

``` text
blue-code/
├── backend/     # API REST en Node.js + Express + Prisma
├── frontend/    # Panel de administración web en React + Recharts
└── mobile/      # Aplicación móvil de consulta en Flutter + Riverpod

```

-----

⚠️ DISCLAIMER (Descargo de Responsabilidad)
IMPORTANTE: Este software es un prototipo conceptual (demo) desarrollado exclusivamente con fines académicos para la Olimpiada Nacional de Educación Técnico Profesional 2026 (ONETP). El sistema implementa reglas de negocio simplificadas y carece de las certificaciones, auditorías de seguridad informática y controles éticos requeridos para operar en entornos médicos reales o gestionar datos sensibles de pacientes en producción. Los autores no se responsabilizan por el uso de este código, total o parcial, en cualquier entorno de atención sanitaria real.
>>>>>>> 2196cf8466fe0d352eb53e8600c0419976b9f142
