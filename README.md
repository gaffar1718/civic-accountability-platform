# India Civic Accountability Platform

> **Track Every Rupee. Hold Every Official. Built for Citizens, Funded by No One.**

A zero-cost, open-source civic accountability platform that exposes delayed public infrastructure projects, budget overruns, and contractor failures across all 28 Indian states and 8 Union Territories — updated automatically every day via GitHub Actions.

---

## Attribution (MANDATORY — Apache 2.0)

| Role | Name |
|---|---|
| **Lead Architect & Original Creator** | Shaik Abdul Gaffar |
| **Data Strategy & Ideation** | Sudarraman Yateendran |
| **Civic Policy Researcher** | Vummiti Yasho Vardhan |
| **UI/UX & Accessibility Consultant** | Vishnumurthula Santosh |
| **Security & Quality Assurance** | Borra Shashi Ram |

> ⚠️ **Any fork, clone, or derivative work MUST retain this attribution block** in the LICENSE, index.html, App.jsx, and scraper/main.py per Apache 2.0 Section 4(c).

---

## Features

- 🗺️ **Interactive Leaflet Map** — colour-coded by severity, fly-to animation on card click
- 🔴 **Severity Algorithm** — `Score = sanctioned_amount_cr × (100 − progress_percent)`
- 📊 **2×2 Accountability Grid** — Contractor, Sanctioned Under, Current Govt, Official in Charge
- 📣 **SHARE TO EXPOSE** — `html2canvas` screenshot → `navigator.share()` on mobile, PNG download on desktop
- 🛡️ **Bot-Proof Forms** — Netlify Forms + Cloudflare Turnstile + honeypot field
- 🤖 **Daily Scraper** — fetches from eprocure.gov.in (CPPP) with automatic fallback to curated seed data
- 🔒 **Enterprise Security** — strict CSP, HSTS, X-Frame-Options, CORP/COEP headers via Netlify

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Map | react-leaflet + Leaflet.js |
| Screenshots | html2canvas |
| CAPTCHA | Cloudflare Turnstile |
| Backend (forms) | Netlify Forms |
| Scraper | Python 3.11, requests, BeautifulSoup4 |
| CI/CD | GitHub Actions (daily cron) |
| Hosting | Netlify (zero-cost) |

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.10
- A Netlify account (free)
- A Cloudflare Turnstile site key (free)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_ORG/india-civic-accountability.git
cd india-civic-accountability
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local and set your Cloudflare Turnstile site key:
# VITE_TURNSTILE_SITE_KEY=your_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Run Scraper Locally

```bash
pip install -r scraper/requirements.txt
python scraper/main.py
```

Output is written to `public/data.json`.

---

## Deployment (Netlify)

1. Push to GitHub
2. Connect repo to Netlify
3. Set build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Add environment variable: `VITE_TURNSTILE_SITE_KEY`
5. The `netlify.toml` handles redirects and all security headers automatically

---

## GitHub Actions — Daily Scrape

The workflow at `.github/workflows/scrape_and_deploy.yml` runs:
- **Automatically** every day at midnight UTC (`cron: '0 0 * * *'`)
- **Manually** via `workflow_dispatch` from the Actions tab
- **On push** to `main` affecting scraper files

It scrapes eprocure.gov.in, validates the JSON, auto-commits `public/data.json`, and triggers a Netlify deploy.

---

## Security Architecture

| Header | Value |
|---|---|
| Content-Security-Policy | Strict — blocks inline scripts, limits origins |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Permissions-Policy | Denies camera, mic, geolocation, payment |
| Cross-Origin-Opener-Policy | `same-origin` |

---

## Project Schema

Each project in `public/data.json` follows this schema:

```json
{
  "id": "AP-001",
  "project_title": "string",
  "state": "string",
  "constituency": "string",
  "sanctioned_amount_cr": 142.5,
  "progress_percent": 18,
  "start_date": "YYYY-MM-DD",
  "contractor": "string",
  "ruling_party_at_start": "string",
  "current_ruling_party": "string",
  "official_in_charge": "string",
  "coordinates": [16.2517, 81.1498],
  "severity_score": 11685,
  "source": "string",
  "delay_months": 28,
  "tags": ["road", "drainage"]
}
```

---

## License

Apache 2.0 — see [LICENSE](./LICENSE).
