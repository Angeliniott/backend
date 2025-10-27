# TODO: Permitir que administradores accedan a tiempoextra_admin2.html con funcionalidades de admin2

## Información Recopilada
- Los administradores (role 'admin') actualmente pueden acceder a tiempoextra.html y enviar solicitudes.
- Los admin2 (role 'admin2') pueden revisar solicitudes pendientes en tiempoextra_admin2.html.
- El usuario quiere que los 'admin' también puedan acceder a tiempoextra_admin2.html desde el botón "Revisar Solicitudes" en tiempoextra.html y realizar las mismas acciones que los admin2 (ver y aprobar/rechazar solicitudes pendientes).
- Rutas backend relevantes: /tiempoextra/admin2/pendientes (GET) y /tiempoextra/admin2/:id (PUT), actualmente restringidas solo a role 'admin2'.
- Frontend: tiempoextra.html ya tiene el botón que lleva a tiempoextra_admin2.html. tiempoextra_admin2.html ya maneja la UI para ver y actualizar solicitudes.

## Plan
- [x] Modificar rutas en routes/tiempoextra.js para permitir acceso a role 'admin' y 'admin2' en /admin2/pendientes y /admin2/:id.
- [x] Verificar que el frontend tiempoextra_admin2.html funcione correctamente con ambos roles (ya debería, ya que no verifica role específicamente).

## Archivos Dependientes
- routes/tiempoextra.js: Modificar verificación de roles en rutas /admin2/pendientes y /admin2/:id.

## Pasos de Seguimiento
- [x] Probar las rutas modificadas para asegurar que 'admin' pueda acceder.
- [x] Verificar en frontend que la funcionalidad de aprobar/rechazar funcione para 'admin'.
