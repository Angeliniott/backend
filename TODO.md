# TODO: Add "Estado de Tiempo Extraordinario" Button in Dashboard

## Backend Changes
- [ ] Add `sendEmployeeTiempoExtraNotification` function in `utils/emailService.js`
- [ ] Modify `routes/tiempoextra.js` POST `/solicitar` to send notification to employee upon request creation
- [ ] Add new GET `/employee/solicitudes` endpoint in `routes/tiempoextra.js` for employees to fetch their overtime requests

## Frontend Changes
- [ ] Add "Estado de Tiempo Extraordinario" button in `../frontend/dashboard.html` lower button grid, redirecting to `estado_tiempoextra.html`
- [ ] Create new `../frontend/estado_tiempoextra.html` page to display employee's overtime requests with approval statuses

## Followup Steps
- [ ] Test new endpoint and notifications
- [ ] Verify frontend display and authentication
