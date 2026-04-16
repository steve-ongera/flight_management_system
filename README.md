# ✈ Paramount Charters — Flight Management System v1

> **Private aviation operations platform** for charter booking, fleet management, crew scheduling, maintenance tracking, and financial reporting.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Role & Permission Matrix](#role--permission-matrix)
- [Data Models](#data-models)
- [Environment Setup](#environment-setup)
- [Running the Project](#running-the-project)
- [Key Features](#key-features)
- [Dashboard Endpoints](#dashboard-endpoints)
- [Email System](#email-system)
- [Known Limitations (v1)](#known-limitations-v1)
- [Roadmap (v2)](#roadmap-v2)

---

## Overview

Paramount Charters FMS is a full-stack web application that replaces spreadsheet-based charter operations with a unified platform. It handles the entire lifecycle of a private charter flight — from public inquiry submission through crew assignment, in-flight tracking, invoicing, and revenue reporting.

```
Public Inquiry → OPS Review → Quote → Confirm → Assign Aircraft & Crew
     → Flight Execution → Status Updates → Invoice → Revenue Report
```

---

## Tech Stack

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Backend     | Python 3.11 · Django 5 · Django REST Framework |
| Auth        | JWT via `djangorestframework-simplejwt`        |
| Database    | PostgreSQL 16                                  |
| Frontend    | React 18 · Vite · React Router v6             |
| Charts      | Recharts                                       |
| HTTP Client | Axios (with JWT interceptor + auto-refresh)    |
| Email       | Django `EmailMultiAlternatives` (SMTP)         |
| Styling     | Custom CSS (CSS variables design system)       |

---

## Project Structure

```
paramount-charters/
│
├── backend/                          # Django project root
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── config/                       # Django project config
│   │   ├── __init__.py
│   │   ├── settings.py               # Base settings
│   │   ├── settings_dev.py           # Development overrides
│   │   ├── settings_prod.py          # Production overrides
│   │   ├── urls.py                   # Root URL config
│   │   └── wsgi.py
│   │
│   └── core/                         # Main application
│       ├── __init__.py
│       ├── models.py                 # All data models (see Data Models)
│       ├── serializers.py            # DRF serializers
│       ├── views.py                  # ViewSets & business logic
│       ├── urls.py                   # App URL routing
│       ├── permissions.py            # Custom permission classes
│       ├── admin.py                  # Django admin registration
│       └── migrations/
│           └── 0001_initial.py
│
└── frontend/                         # React + Vite app
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env.example
    │
    └── src/
        ├── main.jsx                  # App entry point
        ├── App.jsx                   # Router + layout shell
        │
        ├── services/
        │   └── api.js                # Axios instance + all API helpers
        │
        ├── context/
        │   └── AuthContext.jsx       # JWT auth state & hooks
        │
        ├── components/
        │   └── common/
        │       ├── index.jsx         # Barrel export
        │       ├── StatCard.jsx      # KPI stat card
        │       ├── StatusBadge.jsx   # Colored status pill
        │       ├── PriorityBadge.jsx
        │       ├── PageLoader.jsx    # Full-page spinner
        │       └── ToastContainer.jsx
        │
        └── pages/
            ├── LoginPage.jsx
            ├── DashboardPage.jsx     # KPIs + charts + recent activity
            ├── BookingsPage.jsx      # Flight list + filters
            ├── BookingDetailPage.jsx # Full flight record + actions
            ├── AircraftPage.jsx      # Fleet list
            ├── AircraftDetailPage.jsx
            ├── CrewPage.jsx          # Crew roster
            ├── MaintenancePage.jsx   # Maintenance log + alerts
            ├── InvoicesPage.jsx      # Invoice management
            ├── EmailLogPage.jsx      # Sent email history
            ├── UsersPage.jsx         # User admin (admin only)
            └── PublicRequestPage.jsx # Public charter inquiry form
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│                                                             │
│  AuthContext (JWT)  →  api.js (Axios)  →  Pages / Views    │
│  Auto token refresh on 401                                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Django REST API                         │
│                                                             │
│  /api/auth/          AuthViewSet                            │
│  /api/dashboard/     DashboardViewSet   ◄── Unified GET     │
│  /api/airports/      AirportViewSet                         │
│  /api/aircraft/      AircraftViewSet                        │
│  /api/crew/          CrewMemberViewSet                      │
│  /api/bookings/      CharterRequestViewSet (public)         │
│  /api/admin/bookings/ FlightViewSet (ops)                   │
│  /api/admin/maintenance/ MaintenanceLogViewSet              │
│  /api/admin/invoices/    InvoiceViewSet                     │
│  /api/admin/emails/      EmailLogViewSet                    │
│  /api/admin/users/       UserAdminViewSet                   │
│  /api/price-calculator/  PriceCalculatorViewSet             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │   PostgreSQL 16   │
                    └──────────────────┘
```

---

## API Reference

### Authentication

| Method | Endpoint                  | Description              | Auth     |
|--------|---------------------------|--------------------------|----------|
| POST   | `/api/auth/register/`     | Register new user        | Public   |
| POST   | `/api/auth/login/`        | Login → JWT tokens       | Public   |
| GET    | `/api/auth/me/`           | Get current user profile | Required |
| PATCH  | `/api/auth/update_profile/` | Update own profile     | Required |
| POST   | `/api/auth/logout/`       | Blacklist refresh token  | Required |
| POST   | `/api/auth/change_password/` | Change password       | Required |
| POST   | `/api/token/refresh/`     | Refresh access token     | Public   |

### Dashboard

| Method | Endpoint                       | Description                               | Auth       |
|--------|--------------------------------|-------------------------------------------|------------|
| GET    | `/api/dashboard/`              | Unified dashboard (stats + charts + data) | Admin/Ops  |
| GET    | `/api/dashboard/admin/`        | Admin KPI stats only                      | Admin/Ops  |
| GET    | `/api/dashboard/revenue_chart/`| Monthly revenue chart data                | Admin/Ops  |
| GET    | `/api/dashboard/fleet_status/` | Fleet status breakdown                    | Admin/Ops  |
| GET    | `/api/dashboard/pilot/`        | Pilot upcoming flights + hours            | Pilot      |
| GET    | `/api/dashboard/client/`       | Client upcoming + past flights            | Client     |

### Airports

| Method | Endpoint            | Description        | Auth      |
|--------|---------------------|--------------------|-----------|
| GET    | `/api/airports/`    | List all airports  | Required  |
| POST   | `/api/airports/`    | Create airport     | Admin/Ops |
| GET    | `/api/airports/{id}/` | Get airport      | Required  |
| PATCH  | `/api/airports/{id}/` | Update airport   | Admin/Ops |
| DELETE | `/api/airports/{id}/` | Delete airport   | Admin/Ops |

### Aircraft

| Method | Endpoint                         | Description             | Auth      |
|--------|----------------------------------|-------------------------|-----------|
| GET    | `/api/aircraft/`                 | List fleet              | Required  |
| POST   | `/api/aircraft/`                 | Add aircraft            | Admin/Ops |
| GET    | `/api/aircraft/{id}/`            | Get aircraft detail     | Required  |
| PATCH  | `/api/aircraft/{id}/`            | Update aircraft         | Admin/Ops |
| DELETE | `/api/aircraft/{id}/`            | Remove aircraft         | Admin/Ops |
| POST   | `/api/aircraft/{id}/log_hours/`  | Log flight hours        | Admin/Ops |
| POST   | `/api/aircraft/{id}/update_status/` | Change status        | Admin/Ops |

### Crew

| Method | Endpoint            | Description         | Auth           |
|--------|---------------------|---------------------|----------------|
| GET    | `/api/crew/`        | List crew members   | Admin/Ops/Pilot|
| POST   | `/api/crew/`        | Add crew member     | Admin/Ops      |
| GET    | `/api/crew/{id}/`   | Get crew detail     | Admin/Ops/Pilot|
| PATCH  | `/api/crew/{id}/`   | Update crew         | Admin/Ops      |
| GET    | `/api/crew/available/` | List available crew | Admin/Ops   |

### Charter Requests (Public Inquiries)

| Method | Endpoint                                   | Description             | Auth      |
|--------|--------------------------------------------|-------------------------|-----------|
| POST   | `/api/bookings/`                           | Submit charter inquiry  | Public    |
| GET    | `/api/bookings/track/{reference}/`         | Track request by UUID   | Public    |
| GET    | `/api/admin/bookings/`                     | List all requests       | Admin/Ops |
| PATCH  | `/api/admin/bookings/{id}/update_status/`  | Change request status   | Admin/Ops |
| POST   | `/api/admin/bookings/{id}/convert_to_flight/` | Create flight from request | Admin/Ops |

### Flights (Operations)

| Method | Endpoint                                | Description             | Auth           |
|--------|-----------------------------------------|-------------------------|----------------|
| GET    | `/api/admin/bookings/`                  | List flights            | All roles      |
| POST   | `/api/admin/bookings/`                  | Create flight           | Admin/Ops      |
| GET    | `/api/admin/bookings/{id}/`             | Flight detail           | All roles      |
| PATCH  | `/api/admin/bookings/{id}/`             | Update flight           | Admin/Ops      |
| POST   | `/api/admin/bookings/{id}/set_price/`   | Set quote + notify client | Admin/Ops    |
| PATCH  | `/api/admin/bookings/{id}/update_status/` | Update flight status  | Admin/Ops/Pilot|
| POST   | `/api/admin/bookings/{id}/assign_crew/` | Assign captain + FO     | Admin/Ops      |
| POST   | `/api/admin/bookings/{id}/reply/`       | Email client            | Admin/Ops      |
| GET    | `/api/admin/bookings/upcoming/`         | Upcoming flights        | All roles      |
| GET    | `/api/admin/bookings/today/`            | Today's flights         | All roles      |

### Maintenance

| Method | Endpoint                              | Description              | Auth           |
|--------|---------------------------------------|--------------------------|----------------|
| GET    | `/api/admin/maintenance/`             | List maintenance logs    | Admin/Ops/Pilot|
| POST   | `/api/admin/maintenance/`             | Schedule maintenance     | Admin/Ops      |
| PATCH  | `/api/admin/maintenance/{id}/`        | Update log               | Admin/Ops      |
| GET    | `/api/admin/maintenance/upcoming/`    | Next 30 days schedule    | Admin/Ops      |
| GET    | `/api/admin/maintenance/alerts/`      | Aircraft due/overdue     | Admin/Ops      |

### Invoices

| Method | Endpoint                                | Description           | Auth      |
|--------|-----------------------------------------|-----------------------|-----------|
| GET    | `/api/admin/invoices/`                  | List invoices         | All roles |
| POST   | `/api/admin/invoices/`                  | Create invoice        | Admin/Ops |
| GET    | `/api/admin/invoices/{id}/`             | Invoice detail        | All roles |
| POST   | `/api/admin/invoices/{id}/mark_paid/`   | Mark as paid          | Admin/Ops |
| POST   | `/api/admin/invoices/{id}/send_to_client/` | Email invoice      | Admin/Ops |

### Utilities

| Method | Endpoint                        | Description             | Auth      |
|--------|---------------------------------|-------------------------|-----------|
| POST   | `/api/price-calculator/`        | Calculate charter price | Admin/Ops |
| GET    | `/api/admin/emails/`            | Email send history      | Admin/Ops |
| POST   | `/api/admin/emails/send/`       | Send ad-hoc email       | Admin/Ops |
| GET    | `/api/admin/users/`             | List users              | Admin     |
| POST   | `/api/admin/users/{id}/toggle_active/` | Enable/disable user | Admin  |

---

## Role & Permission Matrix

| Feature                  | Admin | Ops | Pilot | Client | Public |
|--------------------------|:-----:|:---:|:-----:|:------:|:------:|
| Submit charter inquiry   | ✓     | ✓   | ✓     | ✓      | ✓      |
| Track inquiry by UUID    | ✓     | ✓   | ✓     | ✓      | ✓      |
| View own flights         | ✓     | ✓   | ✓     | ✓      | —      |
| View all flights         | ✓     | ✓   | —     | —      | —      |
| Create / edit flights    | ✓     | ✓   | —     | —      | —      |
| Update flight status     | ✓     | ✓   | ✓     | —      | —      |
| Set price / quote        | ✓     | ✓   | —     | —      | —      |
| Assign crew              | ✓     | ✓   | —     | —      | —      |
| Manage aircraft          | ✓     | ✓   | —     | —      | —      |
| View fleet               | ✓     | ✓   | ✓     | —      | —      |
| Manage maintenance       | ✓     | ✓   | View  | —      | —      |
| Create / send invoices   | ✓     | ✓   | —     | —      | —      |
| View own invoices        | ✓     | ✓   | —     | ✓      | —      |
| Send emails              | ✓     | ✓   | —     | —      | —      |
| View email log           | ✓     | ✓   | —     | —      | —      |
| Manage users             | ✓     | —   | —     | —      | —      |
| Admin dashboard          | ✓     | ✓   | —     | —      | —      |

---

## Data Models

```
User (AbstractUser)
 ├── role: admin | ops | pilot | client
 ├── phone, company, avatar_url, license_number
 └── → CrewMember (OneToOne, pilot only)

Airport
 └── code, name, city, country, lat/lng, is_active

Aircraft
 ├── tail_number, name, make, model, category
 ├── passenger_capacity, range_km, cruise_speed_kmh
 ├── hourly_rate_usd, status
 ├── total_flight_hours, maintenance_interval_hours
 ├── last_maintenance_date, next_maintenance_date
 ├── insurance_expiry, airworthiness_expiry
 └── → MaintenanceLog (many)

CrewMember
 ├── → User (OneToOne)
 ├── crew_role: captain | first_officer | cabin_crew | engineer
 ├── license_number, license_expiry, medical_expiry
 ├── type_ratings (JSON), total_hours, status
 └── → Airport (base)

CharterRequest  ← public inquiry form
 ├── client_name, client_email, client_phone, company
 ├── trip_type: one_way | round_trip | multi_leg
 ├── → Airport origin, destination
 ├── departure_date, passenger_count, preferred_category
 ├── catering_requested, ground_transport
 ├── status: pending | quoted | confirmed | cancelled
 └── → Flight (OneToOne, optional)

Flight  ← operational record
 ├── flight_number (e.g. PC-1234)
 ├── → CharterRequest (optional)
 ├── → User client
 ├── → Airport origin, destination
 ├── departure_dt, arrival_dt, actual_departure_dt, actual_arrival_dt
 ├── → Aircraft
 ├── → CrewMember captain, first_officer
 ├── passenger_count, manifest (JSON)
 ├── estimated_hours, actual_hours, fuel_uplift_kg
 ├── quoted_price_usd, commission_pct, commission_usd, net_revenue_usd
 ├── status: scheduled | boarding | departed | in_flight |
 │          landed | completed | cancelled | diverted | delayed
 ├── is_invoiced
 └── → FlightLeg (many, for multi-leg)

FlightLeg
 ├── → Flight
 ├── leg_number, → Airport origin/destination
 └── departure_dt, arrival_dt, status

MaintenanceLog
 ├── → Aircraft
 ├── maintenance_type: routine | repair | inspection |
 │                     upgrade | emergency | annual
 ├── status: scheduled | in_progress | completed | cancelled
 ├── scheduled_date, completed_date, flight_hours_at
 ├── technician, facility, cost_usd
 └── description, notes

Invoice
 ├── → Flight (OneToOne)
 ├── invoice_number, client_name, client_email
 ├── amount_usd, tax_pct, tax_usd, total_usd
 ├── due_date, paid_date
 └── status: draft | sent | paid | overdue | cancelled

EmailLog
 ├── → User sent_by
 ├── to_email, to_name, subject, body
 ├── email_type, related_id
 └── sent_at, success, error_msg

Notification
 ├── → User
 ├── title, message, notif_type: info | warning | alert | success
 └── is_read, link
```

---

## Environment Setup

### Backend `.env`

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=paramount_charters
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=ops@paramountcharters.co.ke
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=ops@paramountcharters.co.ke

# JWT
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_DAYS=7
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:8000/api
```

---

## Running the Project

### Backend

```bash
# 1. Clone and enter backend
cd backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy environment file
cp .env.example .env              # Fill in your values

# 5. Create database
createdb paramount_charters       # or via psql

# 6. Run migrations
python manage.py migrate

# 7. Create superuser
python manage.py createsuperuser

# 8. (Optional) Load seed data
python manage.py loaddata seed.json

# 9. Start server
python manage.py runserver
```

### Frontend

```bash
# 1. Enter frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env              # Set VITE_API_URL

# 4. Start dev server
npm run dev
```

App runs at: `http://localhost:5173`  
API runs at: `http://localhost:8000/api`  
Django admin: `http://localhost:8000/admin`

### Requirements (`requirements.txt`)

```
Django>=5.0
djangorestframework>=3.15
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
psycopg2-binary>=2.9
python-decouple>=3.8
Pillow>=10.0
```

---

## Key Features

### Unified Dashboard (`GET /api/dashboard/`)

Single endpoint returns everything needed to render the dashboard in one request:

```json
{
  "stats": {
    "total_bookings": 142,
    "pending_inquiries": 7,
    "in_flight": 3,
    "completed": 118,
    "total_revenue": 2840000.00,
    "monthly_revenue": 340000.00,
    "total_commission": 284000.00,
    "total_aircraft": 12,
    "available_aircraft": 8,
    "total_crew": 24,
    "crew_available": 18
  },
  "revenue_chart": [
    { "month": "2025-01", "label": "Jan 2025", "gross": 280000, "commission": 28000, "net": 252000 }
  ],
  "status_distribution": {
    "scheduled": 12, "in_flight": 3, "completed": 118, "cancelled": 9
  },
  "recent_bookings": [ ... ],
  "maintenance_alerts": [ ... ]
}
```

### Automatic Commission Calculation

On every `Flight.save()`, commission and net revenue are computed automatically:

```python
commission_usd  = quoted_price_usd × commission_pct / 100
net_revenue_usd = quoted_price_usd − commission_usd
```

### Price Calculator

```json
POST /api/price-calculator/
{
  "aircraft_id": 3,
  "estimated_hours": 4.5,
  "passenger_count": 6,
  "catering": true,
  "ground_transport": false,
  "concierge": true,
  "discount_pct": 5,
  "commission_pct": 10
}
```

Returns a full breakdown: base cost, add-ons, subtotal, discount, commission, grand total.

### Flight Hour Tracking

When a flight status is updated to `completed` with `actual_hours`:
- Aircraft `total_flight_hours` increments automatically
- Captain and First Officer `total_hours` both increment
- Maintenance due flag re-evaluates against `maintenance_interval_hours`

---

## Dashboard Endpoints

The `GET /api/dashboard/` endpoint is role-aware:

| Role         | Returns                                              |
|--------------|------------------------------------------------------|
| `admin`/`ops`| Full stats + revenue chart + recent bookings + alerts|
| `pilot`      | Upcoming assigned flights + total hours + status     |
| `client`     | Upcoming + past flights + pending inquiry count      |

---

## Email System

All outbound emails are sent via `EmailMultiAlternatives` (plain text + HTML) and logged to `EmailLog` regardless of success or failure.

**Triggered automatically by:**
- `set_price` action on a flight → quote email to client
- `send_to_client` action on invoice → invoice email to client

**Triggered manually by:**
- `POST /api/admin/emails/send/` → ad-hoc email to any address
- `POST /api/admin/bookings/{id}/reply/` → email the client linked to a flight

---

## Known Limitations (v1)

- No file attachments on emails (invoices are text-only, no PDF)
- No real-time updates (no WebSocket / SSE — requires page refresh)
- No multi-timezone support (all times stored as UTC)
- No calendar view for scheduling conflicts
- No automated maintenance due notifications (checked on-demand only)
- JWT refresh token blacklist requires `django-simplejwt` token blacklist app enabled
- No rate limiting on public charter inquiry endpoint
- Price calculator does not account for landing fees or repositioning costs
- No audit log for record changes

---

## Roadmap (v2)

- [ ] PDF invoice generation and email attachment
- [ ] WebSocket flight status board (live ops view)
- [ ] Calendar / Gantt view for fleet and crew scheduling
- [ ] Automated email reminders (departure D-1, invoice overdue)
- [ ] Multi-leg flight builder UI
- [ ] Document expiry alerts (insurance, airworthiness, crew medicals)
- [ ] Mobile app (React Native) for pilots
- [ ] Stripe payment integration for client self-pay
- [ ] Multi-currency support (KES, USD, EUR)
- [ ] Audit trail / change history on all records
- [ ] Public charter marketplace listing page

---

## License

Proprietary — Paramount Charters © 2025. All rights reserved.