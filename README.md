# آفتاب‌چنج · AftabChange

Iranian take on Changers.com: a portable solar kit measures the energy you produce, **1 Wh = 1 credit**, and you spend credits in a green rewards market while competing with friends and cities.

- `frontend/` Next.js 16 (App Router) + Tailwind 4 + Motion. fa/en (RTL/LTR), light/dark/automatic, fully responsive.
- `backend/` FastAPI + SQLite (seeded demo data on first start).

## Run

```bash
docker compose up --build        # app → http://localhost:3045, API docs → http://localhost:8045/docs
```

Local dev:

```bash
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/uvicorn main:app --port 8045
cd frontend && npm install && BACKEND_URL=http://localhost:8045 npm run dev
```

Test: `cd backend && .venv/bin/pip install pytest httpx && .venv/bin/pytest`

## API

Demo account: **09120000000 / aftab1234** (or the "Try the demo account" button on the login page).

| Method | Path | Auth | |
| --- | --- | --- | --- |
| POST | `/api/auth/register` · `/login` · `/logout` | – | phone + password, httpOnly `sid` session cookie (Persian digits accepted) |
| GET / PATCH | `/api/me` | ✓ | profile, orders, redeemed codes / edit name + city |
| GET | `/api/overview` | ✓ | my wallet, last 7 days, challenges |
| POST | `/api/sync` | ✓ | simulate a kit upload (adds Wh + credits) |
| POST | `/api/rewards/{id}/redeem` | ✓ | spend credits, returns a code (400 `not_enough_credits`) |
| POST | `/api/orders` | ✓ | order a kit; total priced server-side (422 `invalid_qty`) |
| GET | `/api/community` · `/api/leaderboard` · `/api/rewards` | – | public stats, rankings, market items |

Not included (need external services): payment gateway (orders are "processing" until staff call), SMS OTP, real kit telemetry (`/api/sync` simulates it). Set `COOKIE_SECURE=1` behind HTTPS.
