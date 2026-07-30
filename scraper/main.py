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
REQUEST_TIMEOUT = 60   # seconds

# =============================================================================
# SCHEMA HELPERS
# =============================================================================

def _safe_float(value: str | None, default: float = 0.0) -> float:
    """Parse a numeric string that may contain commas or currency symbols."""
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
    """Return a validated project record matching the frontend schema."""
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

def _state_centroid(state: str) -> list[float]:
    """Return a rough centroid coordinate for a state as [lat, lng]."""
    centroids: dict[str, list[float]] = {
        "Andhra Pradesh": [15.9129, 79.7400],
        "Telangana":      [17.3850, 78.4867],
        "Maharashtra":    [19.7515, 75.7139],
        "Delhi NCT":      [28.7041, 77.1025],
    }
    return centroids.get(state, [20.5937, 78.9629])

# =============================================================================
# LIVE SCRAPER — Parse.bot Integration
# =============================================================================

def scrape_live() -> list[dict[str, Any]] | None:
    """
    Attempt to fetch live project data via Parse.bot to bypass WAF.
    """
    log.info("Attempting live scrape from CPPP (eprocure.gov.in)…")
    api_key = os.environ.get("PARSE_API_KEY")
    
    if not api_key:
        log.warning("No PARSE_API_KEY found in environment. Forcing fallback.")
        return None
        
    try:
        log.info("Bypassing firewall via Parse.bot API...")
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "url": "https://eprocure.gov.in/cppp/latestactivetenders",
            "instruction": "Extract active tenders table. Return JSON array with project_title, state, sanctioned_amount_cr, and contractor."
        }
        
        response = requests.post("https://api.parse.bot/dispatch", headers=headers, json=payload, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        
        log.info("Successfully fetched live data via Parse.bot!")
        raw_data = response.json()
        
        projects: list[dict[str, Any]] = []
        for idx, item in enumerate(raw_data, start=1):
            projects.append(
                build_project_record(
                    id=f"LIVE-{idx:04d}",
                    project_title=item.get("project_title", f"Project #{idx}"),
                    state=item.get("state", "Unknown"),
                    constituency="Unknown",
                    sanctioned_amount_cr=_safe_float(item.get("sanctioned_amount_cr", 0)),
                    progress_percent=0.0,
                    start_date=str(date.today()),
                    contractor=item.get("contractor", "Unknown"),
                    ruling_party_at_start="Unknown",
                    current_ruling_party="Unknown",
                    official_in_charge="Unknown",
                    coordinates=_state_centroid(item.get("state", "Unknown")),
                    source="eprocure.gov.in (via Parse.bot)",
                )
            )
        
        if not projects:
            log.warning("Parse API returned empty data. Falling back.")
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
    """
    Returns an empty dataset.
    This ensures no fake or placeholder data is ever pushed to the live site.
    """
    log.info("Fail-Safe Engine activated — returning 0 projects to keep platform truthful.")
    return []

# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main() -> None:
    log.info("=" * 70)
    log.info("India Civic Accountability — Data Scraper v1.1")
    log.info("Lead Architect: Shaik Abdul Gaffar")
    log.info("=" * 70)

    # 1. Check if user forced seed data via GitHub Actions input
    force_seed = os.environ.get("FORCE_SEED_DATA", "false").lower() == "true"
    
    projects = None
    if not force_seed:
        projects = scrape_live()
        
    if projects is None:  # If scrape failed, returns None, triggering the safe empty fallback
        log.warning("Live scrape unavailable or skipped — activating Fail-Safe Engine.")
        projects = get_seed_data()

    # 2. Ensure output directory exists
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    # 3. Write data to public/data.json
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(projects, f, indent=2, ensure_ascii=False)

    log.info("✅  Wrote %d projects → %s", len(projects), OUTPUT_PATH)
    
    # 4. Final summary
    if projects:
        top_project = sorted(projects, key=lambda x: x["severity_score"], reverse=True)[0]
        log.info("Pipeline complete. Top project: [%s] %s (Severity: %s)", 
                 top_project["id"], top_project["project_title"], int(top_project["severity_score"]))
    else:
        log.info("Pipeline complete. No projects loaded.")

if __name__ == "__main__":
    main()
