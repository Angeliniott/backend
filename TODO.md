# TODO: Implement "Tiempo por Tiempo" Feature

## Backend Changes
- [x] Update models/solicitudTiempoExtra.js: Add type field and workedDates array
- [x] Update routes/tiempoextra.js: Handle new type in /solicitar, validate and save workedDates
- [x] Update utils/emailService.js: Modify email functions to handle new type

## Frontend Changes
- [x] Update ../frontend/tiempoextra.html: Add toggle, conditional fields for dates
- [x] Update ../frontend/tiempoextra_admin2.html: Display workedDates for new type
- [x] Update ../frontend/registro_peticiones_admin.html: Show workedDates in table for new type

## Testing
- [ ] Test form submission for both types
- [ ] Test admin2 approval flow
- [ ] Test employee enterado/trabajado marking
- [ ] Verify emails for both types
- [ ] Ensure backward compatibility
