# TODO: Implement ADMIN Overtime Request Format Changes

## Backend Changes
- [x] Update MongoDB schema in `models/solicitudTiempoExtra.js`:
  - Change `date` to `startDate` and `endDate`
  - Rename hour fields: `entreSemana` -> `horasEntreSemana`, `finSemana` -> `horasFinSemana`, `festivo` -> `diasFestivos`, `bonoViaje` -> `bonoEstanciaFinSemana` + `bonoViajeFinSemana`
  - Add `reportePath` for file attachment
- [x] Add multer dependency to `package.json`
- [x] Run `npm install` to install multer
- [x] Modify `routes/tiempoextra.js`:
  - Add multer middleware for file uploads
  - Update POST /solicitar to handle date range, new field names, and file saving
  - Update validation logic for new fields
  - Ensure GET routes return updated fields correctly
- [x] Update `utils/emailService.js`:
  - Modify `sendTiempoExtraNotification` to include date range, detailed hours breakdown, and attachment info
  - Modify `sendEmployeeTiempoExtraNotification` similarly

## Testing
- [ ] Test file upload functionality
- [ ] Test complete flow with new fields

## Frontend Changes (External)
- [x] Update frontend form to use date range inputs instead of single date
- [x] Add file input for report attachment
- [x] Update admin2 review page to display new fields
- [x] Update employee status page to show new information
- [x] Fix confirmation message and form reset after submission
