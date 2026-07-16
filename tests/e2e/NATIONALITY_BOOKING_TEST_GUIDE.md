# Nationality booking E2E guide

These workflows run only against an explicitly configured E2E environment.

Required variables:

- `E2E_FRONTEND_BASE_URL`
- `E2E_API_BASE_URL`
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`
- `E2E_RUN_ID`
- `E2E_ALLOW_WRITES`
- `E2E_EXTERNAL_MOCK_MODE`

Do not use production hosts, shared credentials, or legacy aliases. Run
`npm run e2e:preflight` before the focused nationality workflow.
