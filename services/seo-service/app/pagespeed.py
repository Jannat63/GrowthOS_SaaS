"""
Real Core Web Vitals — Section 4.1.3, "Core Web Vitals Monitor".
Uses Google's PageSpeed Insights API, which is FREE (no billing account
required). An API key raises the rate limit but isn't strictly required for
light use — see https://developers.google.com/speed/docs/insights/v5/get-started
"""
import os
import requests

PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
PAGESPEED_API_KEY = os.getenv("PAGESPEED_API_KEY")  # optional — raises rate limit


class PageSpeedError(Exception):
    pass


def get_core_web_vitals(url: str, strategy: str = "mobile") -> dict:
    """
    Returns real LCP, INP/FID, CLS, and the overall performance score for a URL.
    strategy: "mobile" or "desktop"
    """
    params = {"url": url, "strategy": strategy, "category": "performance"}
    if PAGESPEED_API_KEY:
        params["key"] = PAGESPEED_API_KEY

    try:
        resp = requests.get(PAGESPEED_API_URL, params=params, timeout=30)
    except requests.RequestException as e:
        raise PageSpeedError(f"Request to PageSpeed API failed: {e}")

    if resp.status_code != 200:
        raise PageSpeedError(f"PageSpeed API returned {resp.status_code}: {resp.text[:200]}")

    data = resp.json()
    lighthouse = data.get("lighthouseResult", {})
    audits = lighthouse.get("audits", {})
    categories = lighthouse.get("categories", {})

    def metric(audit_key: str):
        audit = audits.get(audit_key, {})
        return {
            "value": audit.get("displayValue"),
            "numericValue": audit.get("numericValue"),
            "score": audit.get("score"),  # 0-1, where 1 is best
        }

    return {
        "url": url,
        "strategy": strategy,
        "performanceScore": round((categories.get("performance", {}).get("score") or 0) * 100),
        "lcp": metric("largest-contentful-paint"),
        "cls": metric("cumulative-layout-shift"),
        "inp": metric("interaction-to-next-paint") or metric("total-blocking-time"),
        "fcp": metric("first-contentful-paint"),
    }
