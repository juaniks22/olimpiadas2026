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
