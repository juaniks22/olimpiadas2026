# Blue Code - Sistema de Gestión de Código Azul

Blue Code es una aplicación web integral diseñada para la gestión, registro y auditoría de eventos de **Código Azul** (emergencias cardiorrespiratorias) en entornos intrahospitalarios.

El sistema digitaliza el flujo de trabajo crítico garantizando la trazabilidad cronológica, la gestión de inventario de carros de paro y la asignación estructurada de equipos de respuesta, mitigando los riesgos legales y operativos asociados al registro manual (papel).

## Arquitectura y Stack Tecnológico

El proyecto está estructurado como un **monorepo** que contiene tanto el backend como el frontend, facilitando el desarrollo y el despliegue integrado.

- **Backend:** Node.js, Express 5.x
- **Base de Datos:** PostgreSQL (gestionada a través de Prisma ORM)
- **Frontend:** React (Vite)
- **Autenticación:** JWT (JSON Web Tokens) stateless con caducidad estricta (15 min)
- **Exportación:** Generación de PDF y CSV nativa sin librerías de terceros (por restricciones del proyecto).

---

## Árbol de Directorios y Funcionalidad

A continuación detallamos la estructura principal del proyecto y el propósito funcional de cada archivo o módulo relevante:

```text
olimpiadas2026/
├── backend/
│   ├── package.json           # Dependencias de Node.js del backend (express, prisma, bcrypt, jsonwebtoken).
│   ├── prisma/
│   │   ├── schema.prisma      # Modelo de base de datos relacional y configuración del ORM.
│   │   └── seed.js            # Script para poblar catálogos iniciales en DB.
│   ├── scripts/
│   │   ├── seedAdmin.js       # Crea la cuenta Administradora única.
│   │   └── wipeTestData.js    # Borra todos los datos operativos conservando el Admin (para limpiar tras pruebas).
│   ├── src/
│   │   ├── app.js             # Configuración principal de Express, Middlewares y ruteo de la API.
│   │   ├── server.js          # Punto de entrada (entry point) que inicializa el servidor en el puerto designado.
│   │   ├── config/
│   │   │   ├── env.js         # Validación y exportación unificada de variables de entorno (fail-fast).
│   │   │   └── prisma.js      # Instancia Singleton del cliente de Prisma para acceso a base de datos.
│   │   ├── middleware/
│   │   │   ├── authenticate.js# Interceptor que verifica la firma y validez del JWT en cada petición.
│   │   │   ├── authorize.js   # Valida que el rol del usuario coincida con los roles permitidos en el endpoint.
│   │   │   └── errorHandler.js# Atrapa errores (AppError o genéricos) y formatea la respuesta HTTP para el cliente.
│   │   ├── modules/           # Módulos de dominio (cada uno con su controlador, servicio, repositorio y rutas)
│   │   │   ├── areas/         # ABM de áreas del hospital.
│   │   │   ├── auth/          # Lógica de login y generación de tokens.
│   │   │   ├── calls/         # Núcleo del sistema: creación y registro complejo del evento Código Azul.
│   │   │   ├── crashCarts/    # Gestión de inventario, posiciones y estado (Inhabilitación) de carros de paro.
│   │   │   ├── reports/       # Lógica de auditoría, filtros cruzados y exportaciones de las fichas Utstein.
│   │   │   ├── responseTeam/  # Catálogo de personal médico y posiciones estructuradas (Líder, Vía Aérea, etc.).
│   │   │   └── users/         # ABM de cuentas de usuario (Jefe de Piso y Admin secundario).
│   │   └── utils/
│   │       ├── AppError.js    # Clase de Error personalizada para el manejo semántico de excepciones.
│   │       ├── csv.js         # Exportador nativo de reportes en formato CSV.
│   │       ├── password.js    # Políticas estrictas de complejidad y hashing (bcrypt) de contraseñas.
│   │       ├── pdf.js         # Generador nativo (crudo) de PDF para fichas Utstein (cumpliendo restricción de stack).
│   │       ├── token.js       # Funciones para firmar (sign) y verificar (verify) JWTs.
│   │       └── validate.js    # Utilidades livianas de validación de inputs (sin librerías).
│
├── frontend/
│   ├── package.json           # Dependencias de Node.js del frontend (react, react-router-dom, etc).
│   ├── vite.config.js         # Configuración del empaquetador de React (Vite).
│   ├── index.html             # Punto de entrada HTML (SPA).
│   ├── src/
│   │   ├── App.jsx            # Enrutador principal y Contexto de Autenticación (incluye lógica de expiración).
│   │   ├── main.jsx           # Renderizado del árbol de React en el DOM.
│   │   ├── index.css          # Sistema de diseño centralizado (variables CSS, utilidades y clases globales).
│   │   ├── components/        # Componentes UI reutilizables
│   │   │   ├── CreateCallWizard.jsx # Formulario interactivo complejo por pasos para registrar Código Azul.
│   │   │   ├── FilterBar.jsx        # Barra de filtros dinámicos (fechas, áreas) usada en auditoría.
│   │   │   ├── Header.jsx           # Navegación superior (muestra info del usuario activo y botón logout).
│   │   │   └── ReportDetailModal.jsx# Modal de solo lectura que expone la ficha Utstein completa de un evento.
│   │   ├── layouts/
│   │   │   ├── AdminLayout.jsx      # Layout envolvente del panel Administrador (Sidebar de navegación).
│   │   │   └── GenericLayout.jsx    # Layout envolvente del panel Jefe de Piso.
│   │   ├── pages/                   # Vistas principales ruteadas
│   │   │   ├── LoginPage.jsx        # Pantalla de acceso.
│   │   │   ├── admin/               # Módulos del Administrador (Dashboards y ABMs de catálogos).
│   │   │   └── generic/             # Dashboards operativos y de historial para el Jefe de Piso.
│   │   └── utils/
│   │       ├── callMappers.js       # Helpers para transformar y formatear la jerarquía JSON del backend a UI.
│   │       └── reportExportUtils.js # Gatilladores del frontend para descargar reportes en CSV/PDF.
```

---

## Requisitos Previos

- **Node.js** v20+
- **PostgreSQL** v14+ instalado y corriendo.

## Configuración y Despliegue Local

1. **Variables de Entorno (`backend/.env`)**
   Crear un archivo `.env` en la raíz del backend con el siguiente contenido:
   ```env
   DATABASE_URL="postgresql://USUARIO:PASSWORD@localhost:5432/bluecode?schema=public"
   JWT_SECRET="una_clave_secreta_muy_larga"
   JWT_EXPIRES_IN="15m"
   PORT=3000
   ```

2. **Instalación y Base de Datos**
   ```bash
   cd backend
   npm install
   
   # Generar el cliente de base de datos
   npm run build 

   # Sincronizar el esquema de Prisma con la DB (crear tablas)
   npm run prisma:migrate

   # Inyectar catálogos obligatorios y el usuario Admin base
   npm run seed:meds
   npm run seed:admin
   ```

3. **Ejecución (Monolito en Desarrollo)**
   Para desarrollo, basta con levantar el servidor backend que, en producción, serviría la carpeta `dist` del frontend:
   ```bash
   # En terminal 1 (Backend)
   cd backend
   npm run dev

   # En terminal 2 (Frontend)
   cd frontend
   npm install
   npm run dev
   ```

## Notas Finales de Desarrollo

El sistema está alineado con los Requisitos No Funcionales dictados por las especificaciones, particularmente en cuanto a **rendimiento, mantenibilidad (patrones de inyección de repositorios) y estandarización sin sobrerrecarga de frameworks externos**.
