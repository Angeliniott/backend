# TODO: Modificar Supervisor en Vacaciones

## Información Recopilada
- Archivo HTML: `../frontend/vacaciones.html` tiene select estático con opciones 'elizabeth', 'francisco', 'servicio'.
- Modelo: `models/solicitudvacaciones.js` enum supervisor: ['elizabeth', 'francisco', 'servicio'].
- Rutas: `routes/vacaciones.js` valida supervisor en enum, /resumen devuelve datos de usuario pero no incluye 'dpt'.
- Usuario: `models/user.js` tiene 'dpt' y 'reporta'.
- Mapeo departamento a supervisor default (inferido):
  - hr: elizabeth
  - apps: francisco
  - servicio: servicio
  - finanzas: francisco
- Gerente General: fsantiago@mazakcorp.com

## Plan
- [] Actualizar `models/solicitudvacaciones.js`: Agregar 'fsantiago@mazakcorp.com' al enum de supervisor.
- [] Actualizar `routes/vacaciones.js`: Cambiar validación de supervisor para incluir nuevo, y en /resumen incluir 'departamento'.
- [] Modificar `../frontend/vacaciones.html`: Cambiar select a dinámico, poblar con default basado en dpt y opción Gerente General.

## Archivos Dependientes
- models/solicitudvacaciones.js
- routes/vacaciones.js
- ../frontend/vacaciones.html

## Seguimiento
- [] Probar funcionalidad después de cambios.
- [] Verificar que select se pueble correctamente y envío funcione.
