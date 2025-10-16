# TODO: Implementar mejoras en ADMIN PANEL

## 1. Ver a la par el checkin y el checkout en hrs
- [ ] Agregar nueva pestaña en admin.html llamada "Sesiones Completas" que muestre checkin/checkout combinados con horas calculadas.
- [ ] Usar datos de /api/work-hours/daily-report para poblar la tabla con sesiones completas.
- [ ] Mostrar columnas: Empleado, Email, Fecha, Hora Checkin, Hora Checkout, Horas Trabajadas, Estado.

## 2. Filtrar por empleados bajo el gerente (admin2)
- [ ] Modificar rutas /api/checkin/report y /api/checkout/report para aceptar parámetro 'supervisor' y filtrar empleados donde user.reporta == supervisor.
- [ ] En admin.html, agregar lógica para detectar si usuario es admin2 y aplicar filtro automático en todas las cargas de datos.
- [ ] Asegurar que el filtro se aplique en todas las pestañas (Check-Ins/Outs, Horas Diarias, Horas Semanales).

## 3. Testing y Verificación
- [ ] Probar filtros en frontend con usuario admin2.
- [ ] Verificar que las horas se calculen correctamente en la nueva pestaña.
- [ ] Confirmar que no se rompa funcionalidad existente.
