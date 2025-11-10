# TODO: Add Edit Functionality to Employee Management

## Steps to Complete

- [x] Add PUT route in routes/user.js for updating user by ID (fields: name, email, role, dpt, fechaIngreso, reporta, diasPendientesPrevios)
- [ ] In employee_management.html, add "Editar" button in the Acciones column of the employees table
- [ ] Add a modal/form in HTML for editing employee details (include fields for name, email, role, dpt, fechaIngreso, reporta, diasPendientesPrevios with appropriate input types)
- [ ] Add JavaScript to handle "Editar" button click: open modal and populate with current user data
- [ ] Add JavaScript to handle edit form submission: validate data types, send PUT request to backend, handle response, reload table
- [ ] Test the edit functionality: ensure updates work, data types are respected, and table reloads correctly
