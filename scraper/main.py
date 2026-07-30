#!/usr/bin/env python3
# =============================================================================
# scraper/main.py — India Civic Accountability Platform
# =============================================================================
# Lead Architect & Original Creator  : Shaik Abdul Gaffar
# Data Strategy & Ideation           : Sudarraman Yateendran
# Civic Policy Researcher            : Vummiti Yasho Vardhan
# UI/UX & Accessibility Consultant   : Vishnumurthula Santosh
# Security & Quality Assurance       : Borra Shashi Ram
#
# Licensed under Apache 2.0.
# Any fork or clone MUST retain the above attribution block.
# =============================================================================

from __future__ import annotations

import json
import logging
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("civic-scraper")

# ── Constants ─────────────────────────────────────────────────────────────────
REPO_ROOT      = Path(__file__).resolve().parent.parent
OUTPUT_PATH    = REPO_ROOT / "public" / "data.json"
REQUEST_TIMEOUT = 90   # seconds

# =============================================================================
# SCHEMA HELPERS
# =============================================================================

def _safe_float(value: str | None, default: float = 0.0) -> float:
    if not value:
        return default
    cleaned = re.sub(r"[^\d.]", "", str(value))
    try:
        return float(cleaned) if cleaned else default
    except ValueError:
        return default

def _severity_score(amount_cr: float, progress_pct: float) -> float:
    return amount_cr * (100.0 - progress_pct)

def build_project_record(
    *,
    id: str,
    project_title: str,
    state: str,
    constituency: str,
    sanctioned_amount_cr: float,
    progress_percent: float,
    start_date: str,
    contractor: str,
    ruling_party_at_start: str,
    current_ruling_party: str,
    official_in_charge: str,
    coordinates: list[float],
    source: str = "Platform Research",
    delay_months: int = 0,
    tags: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "id": id,
        "project_title": project_title.strip(),
        "state": state,
        "constituency": constituency,
        "sanctioned_amount_cr": round(sanctioned_amount_cr, 2),
        "progress_percent": max(0.0, min(100.0, progress_percent)),
        "start_date": start_date,
        "contractor": contractor,
        "ruling_party_at_start": ruling_party_at_start,
        "current_ruling_party": current_ruling_party,
        "official_in_charge": official_in_charge,
        "coordinates": coordinates,
        "source": source,
        "delay_months": delay_months,
        "tags": tags or [],
        "severity_score": _severity_score(sanctioned_amount_cr, progress_percent),
        "scraped_at": datetime.utcnow().isoformat() + "Z",
    }

def _infer_state(text: str) -> str:
    state_keywords: dict[str, str] = {
        "andhra": "Andhra Pradesh",
        "telangana": "Telangana",
        "maharashtra": "Maharashtra",
        "karnataka": "Karnataka",
        "tamil": "Tamil Nadu",
        "kerala": "Kerala",
        "delhi": "Delhi NCT",
    }
    text_lower = text.lower()
    for keyword, state_name in state_keywords.items():
        if keyword in text_lower:
            return state_name
    return "Central Government"

def _state_centroid(state: str) -> list[float]:
    centroids: dict[str, list[float]] = {
        "Andhra Pradesh": [15.9129, 79.7400],
        "Telangana":      [17.3850, 78.4867],
        "Maharashtra":    [19.7515, 75.7139],
        "Delhi NCT":      [28.7041, 77.1025],
    }
    return centroids.get(state, [20.5937, 78.9629])

# =============================================================================
# HTML PARSER (BeautifulSoup)
# =============================================================================

def _parse_cppp_table(html: str) -> list[dict[str, Any]]:
    """Parse the CPPP tender search results table into project records."""
    soup = BeautifulSoup(html, "html.parser")
    projects: list[dict[str, Any]] = []

    table = soup.find("table", {"id": re.compile(r"tender", re.I)})
    if not table:
        table = soup.find("table")
    if not table:
        log.warning("No table found in CPPP response HTML.")
        return []

    rows = table.find_all("tr")[1:]  # skip header row
    for idx, row in enumerate(rows, start=1):
        cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
        if len(cells) < 5:
            continue

        raw_amount = _safe_float(cells[3] if len(cells) > 3 else "0")
        title      = cells[1] if len(cells) > 1 else f"Project #{idx}"
        org        = cells[2] if len(cells) > 2 else "Government of India"
        state      = _infer_state(org + " " + title)

        projects.append(
            build_project_record(
                id=f"LIVE-{idx:04d}",
                project_title=title,
                state=state,
                constituency="Unknown",
                sanctioned_amount_cr=raw_amount / 10_000_000,  # paisa → crore
                progress_percent=0.0,
                start_date=str(date.today()),
                contractor=org,
                ruling_party_at_start="Unknown",
                current_ruling_party="Unknown",
                official_in_charge=org,
                coordinates=_state_centroid(state),
                source="eprocure.gov.in (via ScraperAPI)",
            )
        )
    return projects

# =============================================================================
# LIVE SCRAPER — ScraperAPI Integration
# =============================================================================

def scrape_live() -> list[dict[str, Any]] | None:
    log.info("Attempting live scrape from CPPP (eprocure.gov.in)…")
    api_key = os.environ.get("SCRAPER_API_KEY")
    
    if not api_key:
        log.warning("No SCRAPER_API_KEY found in environment. Forcing fallback.")
        return None
        
    try:
        log.info("Bypassing firewall via ScraperAPI Residential Proxies...")
        
        target_url = "https://eprocure.gov.in/cppp/latestactivetenders"
        payload = {
            'api_key': api_key, 
            'url': target_url,
            'render': 'true'
        }
        
        response = requests.get("http://api.scraperapi.com", params=payload, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        
        log.info("Successfully fetched live HTML via ScraperAPI! Parsing data...")
        
        projects = _parse_cppp_table(response.text)
        
        if not projects:
            log.warning("ScraperAPI returned HTML, but no project table was found. Falling back.")
            return None
            
        log.info("Parsed %d live projects.", len(projects))
        return projects

    except Exception as exc:
        log.error("Unexpected error during live scrape: %s", exc)
        return None

# =============================================================================
# FAIL-SAFE SEED ENGINE (Empty Fallback)
# =============================================================================

def get_seed_data() -> list[dict[str, Any]]:
    log.info("Fail-Safe Engine activated — returning 0 projects to keep platform truthful.")
    return []

# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main() -> None:
    log.info("=" * 70)
    log.info("India Civic Accountability — Data Scraper v2.0")
    log.info("Lead Architect: Shaik Abdul Gaffar")
    log.info("=" * 70)

    force_seed = os.environ.get("FORCE_SEED_DATA", "false").lower() == "true"
    
    projects = None
    if not force_seed:
        projects = scrape_live()
        
    if projects is None:
        log.warning("Live scrape unavailable or skipped — activating Fail-Safe Engine.")
        projects = get_seed_data()

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(projects, f, indent=2, ensure_ascii=False)

    log.info("✅  Wrote %d projects → %s", len(projects), OUTPUT_PATH)
    
    if projects:
        top_project = sorted(projects, key=lambda x: x["severity_score"], reverse=True)[0]
        log.info("Pipeline complete. Top project: [%s] %s (Severity: %s)", 
                 top_project["id"], top_project["project_title"], int(top_project["severity_score"]))
    else:
        log.info("Pipeline complete. No projects loaded.")

if __name__ == "__main__":
    main()
