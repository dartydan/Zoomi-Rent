# Airtable Setup for Units

1. Create an Airtable base at [airtable.com](https://airtable.com).

2. Create a table named **Units** (exact name required).

3. Add these fields to the Units table:

| Field name | Type |
|------------|------|
| assigned_user_id | Single line text |
| current_location | Single line text |
| unit_revenue | Number |
| washer_brand | Single line text |
| washer_model | Single line text |
| dryer_brand | Single line text |
| dryer_model | Single line text |
| unit_acquisition_cost | Number |
| acquisition_location | Single line text |
| additional_costs | Number |

4. Create a [Personal Access Token](https://airtable.com/create/tokens) with these scopes for your base:
   - **Required:** `data.records:read`, `data.records:write` (read/write record data)
   - **Optional:** `schema.bases:read`, `schema.bases:write` (not used by the app, but fine to include)

5. Get your Base ID from the base URL: `https://airtable.com/appXXXXXXXXXXXXXX/...` → use `appXXXXXXXXXXXXXX` (include "app").

6. Get your table name or ID: the table must be named exactly "Units", or use the table ID (tblXXXXXXXX) from the API docs.

7. Add to `.env.local`:
```
AIRTABLE_API_KEY=your_token_here
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

**404 troubleshooting:**
- Base ID must include "app" (e.g. `appXXXXXXXXXXXXXX`), from the URL when you open your base
- Table name is case-sensitive; use exact "Units" or set `AIRTABLE_TABLE=tblYourTableId`
- Token must have access to this base (create it from the base's "Help" → API docs)
