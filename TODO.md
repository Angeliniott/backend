# TODO: Implement "Coordinador" Role for Tiempo Extra Access

## Backend Changes
- [x] Update models/user.js: Add 'coordinador' to role enum
- [x] Update middleware/auth.js: Add verifyTiempoExtraAdmin middleware for 'admin', 'admin2', 'coordinador'
- [x] Update routes/tiempoextra.js: Apply verifyTiempoExtraAdmin to /empleados, /solicitar, /admin/solicitudes; keep review routes restricted to 'admin' and 'admin2'

## Frontend Changes (Note: These need to be done in the frontend repository)
- [ ] Update dashboard.html: Show time extra button for coordinador role
- [ ] Update tiempoextra.html: Allow access for coordinador
- [ ] Update registro_peticiones_admin.html: Allow access for coordinador
- [ ] Update tiempoextra_admin2.html: Deny access for coordinador

## Testing
- [x] Test backend routes with coordinador role
- [ ] Test frontend access control
