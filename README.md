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
