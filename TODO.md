# TODO: Modify Vacation Days Calculation to Exclude Weekends

## Steps to Complete:
- [x] Add a utility function `countWeekdaysExcludingHolidays` in `utils/holidayUtils.js` to count weekdays (Mon-Fri) in a date range, excluding holidays.
- [x] Update the vacation days calculation in `routes/vacaciones.js` (POST /solicitar route) to use the new utility function instead of subtracting holidays from total calendar days.
- [x] Test the changes to ensure weekends are excluded and holidays are still deducted.

## Progress:
- [x] Analyze code and create plan
- [x] Get user approval for plan
