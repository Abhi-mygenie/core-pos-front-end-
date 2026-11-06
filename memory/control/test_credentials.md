# Test Credentials
# Agent writes here when creating/modifying auth credentials (admin accounts, test users).
# Testing agent reads this before auth tests. Fork/continuation agents read on startup.

## Preprod POS App
- URL: https://genie-pos-app.preview.emergentagent.com
- Backend: https://preprod.mygenie.online
- Email: owner@cafe103.com
- Password: Qplazm@10
- Role: Owner (cafe103)

## Preprod POS App — Manager (cafe103)
- Email: manager@cafe103.com
- Password: Qplazm@10
- Role: Manager login (API role_name returns Owner; running orders use role_name=Manager)
- Test orders: #021113 (id 1537795, 30% prepaid) · #021114 (id 1537796, 30% prepaid)
