"""Seed local ClickHouse with fixture ad_performance rows so P2.6 (Blended MER) has data.
Run: cd apps/worker && .venv/Scripts/python -m seeds.clickhouse_seed
"""
import datetime as dt
import clickhouse_connect
from app.config import settings

WORKSPACE_ID = "00000000-0000-0000-0000-0000000000aa"  # matches the seeded demo workspace


def _rows() -> list[list]:
    base = dt.date(2026, 7, 1)
    rows: list[list] = []
    for day in range(30):
        d = base + dt.timedelta(days=day)
        # (workspace_id, platform, campaign_id, campaign_name, date, impressions, clicks, spend, conversions, conversion_value)
        rows.append([WORKSPACE_ID, "google_ads", "g-1", "Search - Brand", d, 1000 + day * 10, 80 + day, 45.50, 6, 320.0])
        rows.append([WORKSPACE_ID, "meta_ads", "m-1", "Prospecting - Lookalike", d, 5000 + day * 20, 120 + day, 90.25, 4, 210.0])
    return rows


def seed() -> int:
    client = clickhouse_connect.get_client(host=settings.clickhouse_host, port=settings.clickhouse_port)
    columns = ["workspace_id", "platform", "campaign_id", "campaign_name", "date",
               "impressions", "clicks", "spend", "conversions", "conversion_value"]
    client.insert("ad_performance", _rows(), column_names=columns)
    count = client.query("SELECT count() FROM ad_performance WHERE workspace_id = %(w)s",
                         parameters={"w": WORKSPACE_ID}).result_rows[0][0]
    print(f"OK: ad_performance rows for workspace = {count}")
    return count


if __name__ == "__main__":
    assert seed() >= 60
