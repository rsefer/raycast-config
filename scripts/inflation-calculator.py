#!/usr/bin/env python3

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Inflation Calculator
# @raycast.mode fullOutput

# Optional parameters:
# @raycast.icon 💵
# @raycast.argument1 { "type": "text", "placeholder": "$" }
# @raycast.argument2 { "type": "text", "placeholder": "Starting Year" }
# @raycast.argument3 { "type": "text", "placeholder": "Ending Year", "optional": true }

# Documentation:
# @raycast.author rsefer
# @raycast.authorURL https://raycast.com/rsefer

from __future__ import annotations

import json
import csv
import re
import sys
from datetime import datetime
from urllib.error import URLError
from urllib.request import Request, urlopen


def fail(message: str) -> None:
    print(message)
    raise SystemExit(1)


def parse_args(argv: list[str]) -> tuple[int, int, float]:
    amount = argv[0] if len(argv) > 2 else ""
    start_year = argv[1] if len(argv) > 0 else ""
    end_year = argv[2] if len(argv) > 1 else ""

    # Allow two-argument usage: <starting year> <amount>
    if start_year and end_year and not amount:
        amount = end_year
        end_year = ""

    current_year = datetime.now().year
    if not end_year:
        end_year = str(current_year)

    if not start_year or not amount:
        fail("Usage: Inflation Calculator <starting year> [ending year] <amount>")

    if not re.fullmatch(r"\d{4}", start_year):
        fail("Error: starting year must be a 4-digit year.")

    if not re.fullmatch(r"\d{4}", end_year):
        fail("Error: ending year must be a 4-digit year.")

    if not re.fullmatch(r"-?\d+(\.\d+)?", amount):
        fail("Error: amount must be a valid number (e.g. 100 or 99.95).")

    start_year_i = int(start_year)
    end_year_i = int(end_year)
    amount_f = float(amount)

    if start_year_i > end_year_i:
        fail("Error: starting year must be less than or equal to ending year.")

    if start_year_i < 1913 or end_year_i > current_year:
        fail(f"Error: valid year range is 1913 to {current_year}.")

    return start_year_i, end_year_i, amount_f


def fetch_cpi_for_year(year: int) -> float:
    # Use FRED's public CPI CSV feed (no API key required).
    fred_csv_url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCNS"
    try:
        with urlopen(fred_csv_url, timeout=20) as resp:
            csv_text = resp.read().decode("utf-8")
    except (URLError, TimeoutError, ValueError):
        raise RuntimeError("Error: could not fetch CPI data from FRED. Try again later.")

    monthly_by_year: dict[int, list[float]] = {}
    reader = csv.DictReader(csv_text.splitlines())
    for row in reader:
        values = list(row.values())
        if len(values) < 2:
            continue

        date_value = (values[0] or "").strip()
        cpi_value = (values[1] or "").strip()
        if not date_value or not cpi_value or cpi_value == ".":
            continue

        year_value = date_value.split("-", 1)[0]
        if not year_value.isdigit():
            continue

        parsed_year = int(year_value)
        monthly_by_year.setdefault(parsed_year, []).append(float(cpi_value))

    values = monthly_by_year.get(year)
    if not values:
        raise RuntimeError(f"Error: CPI data unavailable for year {year}.")

    return sum(values) / len(values)


def main() -> None:
    start_year, end_year, amount = parse_args(sys.argv[1:])

    try:
        start_cpi = fetch_cpi_for_year(start_year)
        end_cpi = fetch_cpi_for_year(end_year)
    except RuntimeError as exc:
        fail(str(exc))

    adjusted = amount * (end_cpi / start_cpi)
    inflation_pct = ((end_cpi - start_cpi) / start_cpi) * 100

    green = "\033[92m"
    purple = "\033[95m"
    reset = "\033[0m"

    before_amount = f"${amount:,.2f}"
    after_amount = f"${adjusted:,.2f}"

    year_width = max(len("Year"), len(str(start_year)), len(str(end_year)))
    amount_width = max(len("Amount"), len(before_amount), len(after_amount))

    divider = f"+-{'-' * year_width}-+-{'-' * amount_width}-+"

    print(divider)
    print(f"| {'Year':<{year_width}} | {'Amount':>{amount_width}} |")
    print(divider)
    print(f"| {green}{str(start_year):<{year_width}}{reset} | {purple}{before_amount:>{amount_width}}{reset} |")
    print(f"| {green}{str(end_year):<{year_width}}{reset} | {purple}{after_amount:>{amount_width}}{reset} |")
    print(divider)
    print(f"\n{purple}{inflation_pct:.2f}%{reset} inflation")


if __name__ == "__main__":
    main()
