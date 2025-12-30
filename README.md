# Backend - Vacaciones (Resumen)

Este backend implementa la lógica de solicitudes de vacaciones con conteo de días hábiles (lunes a viernes) excluyendo feriados definidos por la empresa.

## Política de días y vigencias
- Días contados: solo días hábiles; se excluyen feriados.
- Primer año (prestación especial):
  - 0 días antes de 6 meses desde `fechaIngreso`.
  - 6 días habilitados al cumplir 6 meses.
  - +6 días (total 12) al cumplir el primer aniversario.
  - Vigencia: 18 meses contados desde el primer aniversario.
- Años siguientes (≥ año 2):
  - Días se habilitan únicamente al aniversario.
  - Vigencia: 18 meses contados desde cada aniversario.
  - Tabla de días por antigüedad: 12, 14, 16, 18, 20, 22, 24, 26…

## Endpoints clave
- `POST /api/vacaciones/preview`
  - Entrada: `{ fechaInicio, fechaFin, supervisor }`.
  - Salida: desglose de días solicitados (hábiles) distribuidos entre periodos con vigencias.
  - Valida elegibilidad (≥ 6 meses) y disponibilidad.

- `POST /api/vacaciones/solicitar`
  - Crea la solicitud con el mismo desglose y valida disponibilidad.
  - Guarda `diasPeriodoPrevio`, `diasPeriodoActual`, `vigenciaPrevio`, `vigenciaActual`.

- `GET /api/vacaciones/resumen`
  - Opcional `?email=` para consulta admin.
  - Devuelve periodos con: `habilitados`, `usados`, `disponibles`, `vigenciaHasta` y `disponiblesTotal`.

- `GET /api/vacaciones/admin/solicitudes`
  - Devuelve solicitudes para revisión admin. El frontend obtiene “disponibles actuales” consultando `/resumen` por usuario.

### Endpoint de depuración
- `GET /api/vacaciones/debug/periodos`
  - Verifica periodos calculados y días habilitados al día de hoy.
  - Parámetros:
    - `fechaIngreso=YYYY-MM-DD` para simular un ingreso específico.
    - `email=user@example.com` (requiere rol admin) para consultar por usuario.
    - Sin parámetros: usa el usuario autenticado.
  - Respuesta: lista de periodos con `inicio`, `vigenciaHasta` y `habilitadosHoy`.
  - Útil para validar casos como ingreso en noviembre 2023:
    - Año 1: 12 habilitados en el primer aniversario; vigencia +18 meses.
    - Años ≥2: días habilitados en el aniversario correspondiente; vigencia +18 meses.

## Tabla de días por antigüedad
- Año 1: 12 días (regla especial: 6 a los 6 meses; 12 al cumplir 1 año)
- Años 2–5: 14, 16, 18, 20 (crecimiento +2 por año)
- A partir de 6 años: bloques de 5 años con incremento de +2 por bloque
  - 6–10: 22; 11–15: 24; 16–20: 26; 21–25: 28; 26–30: 30; 31–35: 32; 36–40: 34; etc.
- Los días se habilitan en cada aniversario y su vigencia es de 18 meses desde ese aniversario.

## Feriados
- Lista `HOLIDAYS` por año; mantenerla actualizada.
- Utilizada en `countWeekdaysExcludingHolidays` para preview, solicitar y resumen.

## Notas de validación
- El desglose siempre descuenta primero del periodo más antiguo vigente.
- Las solicitudes aprobadas consumen días hábiles y se prorratean por periodos respetando vigencias.

## Desarrollo rápido
- Ejecutar servidor y probar endpoints con token de usuario.
- Verificar `/preview`, `/solicitar`, `/resumen`.
- Revisar `routes/vacaciones.js` para lógica consolidada.

## Administración de Tiempo (Check-in/Check-out)
- Requisito de ubicación: para registrar inicio y fin de sesión se debe enviar `locationUrl` (por ejemplo, `https://www.google.com/maps?q=<lat>,<lng>`).
- Los endpoints rechazarán la solicitud con `400 location_required` si la ubicación no está activa o no se proporcionó.
- Campos guardados en `WorkSession`: `startLocationUrl` y `endLocationUrl`.

## Reset de Base de Datos (manteniendo usuarios)

Este proyecto incluye un script para limpiar datos de prueba y dejar la base “como nueva” conservando la colección de usuarios. El script:

- Borra colecciones: `Vacaciones`, `SolicitudVacaciones`, `SolicitudTiempoExtra`, `Checkin`, `WorkSession`, `DailyWorkHours`, `WeeklyWorkHours`, `SpecialCheck`.
- Conserva `user` intacta.
- Opcionalmente limpia archivos en `uploads/`.
- Opcionalmente crea respaldos JSON por colección en `backend/backups/`.
- Recalcula a cada usuario sus días de vacaciones “actuales” al máximo según antigüedad y fija vigencias; deja 0 en “previos”.

Archivos relevantes:
- Script: [backend/scripts/resetDatabase.js](backend/scripts/resetDatabase.js)
- Respaldo (cuando se usa `--backup`): [backend/backups/](backend/backups/)

Requisitos:
- Definir `MONGO_URI` en `.env`.

Comandos:

```powershell
cd c:\Users\angel\OneDrive\Documents\GitHub\backend

# Vista previa sin cambios (recomendado)
npm run reset:db:dry

# Reset estándar (borra colecciones objetivo; conserva uploads)
npm run reset:db

# Reset completo (con respaldo JSON y limpieza de uploads)
npm run reset:db:full
```

Flags (si corres el script directamente):
- `--dry-run`: muestra el plan sin cambiar datos.
- `--confirm`: requerido para ejecutar cambios.
- `--with-uploads`: borra archivos en `uploads/`.
- `--backup`: exporta cada colección a JSON antes de borrar.

Qué esperar tras el reset:
- Las colecciones objetivo quedan en 0 documentos.
- Los usuarios conservan su registro y quedan con:
  - `diasPendientesPrevios = 0`
  - `diasPendientesActuales =` días máximos según antigüedad actual
  - `vigenciaActuales =` un año desde su aniversario vigente

Notas de seguridad:
- Ejecuta primero `npm run reset:db:dry` para verificar conteos.
- En producción, usa siempre el modo con `--backup` para trazabilidad.
- El script evita validaciones de campos obligatorios de `user` al actualizar saldos (actualiza por `updateOne`).
 - Guard-rail: si `NODE_ENV=production`, el script se bloquea salvo que exportes `ALLOW_RESET=true` explícitamente.

## Deploy en Render (checklist rápido)

- Variables de entorno obligatorias:
  - `MONGO_URI`: cadena de conexión a MongoDB Atlas.
  - `JWT_SECRET`: secreto para firmar tokens.
  - `CORS_ORIGINS`: lista separada por comas con dominios frontend permitidos (por ejemplo: `https://www.portalmmx.com,https://portalmmx.com,https://checkin-mazak.vercel.app,https://*.vercel.app`).
  - `FRONTEND_URL`: URL del portal para enlaces en correos (ej. `https://checkin-mazak.vercel.app`).
- Variables opcionales (correo):
  - `RESEND_API_KEY`, `MAIL_FROM`, `HR_EMAIL`, `LIZ_EMAIL`.
  - Si faltan, los correos se registran como intentos fallidos en logs pero no rompen el flujo de las rutas.
- Supervisores opcionales: `SUP_ELIZABETH`, `SUP_FRANCISCO`, `SUP_SERVICIO`, `SUP_GERENCIA`.
- Comando de inicio: `npm start`.
- Healthcheck: GET `/` debe responder `OK`.
- Protección de reset en producción: no se ejecuta salvo `ALLOW_RESET=true` y `--confirm`.
