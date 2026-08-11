#!/usr/bin/env python3
"""Generate a lightweight animated SVG from a GitHub user's public pull requests.

The script uses only the Python standard library. In GitHub Actions it reads:
  - GITHUB_TOKEN
  - PROFILE_USERNAME (defaults to GITHUB_REPOSITORY_OWNER)
  - GITHUB_GRAPHQL_URL (optional)

If the API is temporarily unavailable and an output file already exists, the
script preserves the existing panel instead of replacing it with an error.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
from pathlib import Path
import sys
import textwrap
from typing import Any
from urllib import error, request

GRAPHQL_QUERY = r"""
query($recent: String!, $authored: String!, $merged: String!, $open: String!) {
  recent: search(query: $recent, type: ISSUE, first: 6) {
    nodes {
      ... on PullRequest {
        title
        url
        number
        createdAt
        updatedAt
        mergedAt
        merged
        state
        isDraft
        additions
        deletions
        changedFiles
        reviewDecision
        repository { nameWithOwner }
      }
    }
  }
  authored: search(query: $authored, type: ISSUE, first: 1) { issueCount }
  merged: search(query: $merged, type: ISSUE, first: 1) { issueCount }
  open: search(query: $open, type: ISSUE, first: 1) { issueCount }
}
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="assets/pr-activity.svg", help="SVG output path")
    parser.add_argument("--username", help="GitHub username; otherwise read from environment")
    parser.add_argument("--fixture", help="Read a saved GraphQL JSON response instead of calling GitHub")
    return parser.parse_args()


def github_data(username: str, token: str, endpoint: str) -> dict[str, Any]:
    today = dt.datetime.now(dt.timezone.utc).date()
    since = today - dt.timedelta(days=365)
    variables = {
        "recent": f"author:{username} is:pr sort:updated-desc",
        "authored": f"author:{username} is:pr",
        "merged": f"author:{username} is:pr is:merged merged:>={since.isoformat()}",
        "open": f"author:{username} is:pr is:open",
    }
    payload = json.dumps({"query": GRAPHQL_QUERY, "variables": variables}).encode("utf-8")
    req = request.Request(
        endpoint,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "healthcare-profile-pr-pulse",
        },
    )
    try:
        with request.urlopen(req, timeout=30) as response:
            result = json.load(response)
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"GitHub API request failed: {exc}") from exc

    if result.get("errors"):
        raise RuntimeError("GitHub GraphQL error: " + json.dumps(result["errors"], ensure_ascii=False))
    if "data" not in result:
        raise RuntimeError("GitHub response did not include a data field")
    return result


def esc(value: Any) -> str:
    return html.escape(str(value), quote=True)


def short_number(value: int) -> str:
    if abs(value) < 1000:
        return str(value)
    if abs(value) < 1_000_000:
        return f"{value / 1000:.1f}k".replace(".0k", "k")
    return f"{value / 1_000_000:.1f}m".replace(".0m", "m")


def compact_title(value: str, width: int = 56) -> str:
    return textwrap.shorten(" ".join(value.split()), width=width, placeholder="…")


def compact_repo(value: str, width: int = 34) -> str:
    return textwrap.shorten(value, width=width, placeholder="…")


def format_date(value: str | None) -> str:
    if not value:
        return "—"
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return value[:10]
    return parsed.strftime("%b %-d, %Y") if os.name != "nt" else parsed.strftime("%b %#d, %Y")


def status_for(pr: dict[str, Any]) -> tuple[str, str, int]:
    if pr.get("isDraft"):
        return "DRAFT", "#9A8FB0", 930
    if pr.get("merged") or pr.get("mergedAt"):
        return "MERGED", "#5EEAD4", 1080
    if str(pr.get("state", "")).upper() == "OPEN":
        review = str(pr.get("reviewDecision") or "").upper()
        if review == "APPROVED":
            return "APPROVED", "#72E6B1", 1030
        if review == "CHANGES_REQUESTED":
            return "CHANGES", "#F3A25C", 930
        return "OPEN", "#E25566", 930
    return "CLOSED", "#8FA3B7", 1080


def render_svg(username: str, payload: dict[str, Any]) -> str:
    data = payload["data"]
    nodes = [node for node in (data.get("recent", {}).get("nodes") or []) if node]
    authored = int(data.get("authored", {}).get("issueCount") or 0)
    merged = int(data.get("merged", {}).get("issueCount") or 0)
    opened = int(data.get("open", {}).get("issueCount") or 0)

    rows = nodes[:6]
    height = 188 + max(3, len(rows)) * 66 + 48
    latest_activity = format_date((rows[0].get("updatedAt") or rows[0].get("createdAt")) if rows else None)

    row_markup: list[str] = []
    if not rows:
        row_markup.append(
            f'''
      <text x="72" y="240" fill="#F4F7FA" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="20" font-weight="650">No public authored pull requests found yet.</text>
      <text x="72" y="269" fill="#8499AD" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="14">The panel will update automatically when public PR activity appears.</text>
      <path d="M735 246H1080" stroke="#30465A" stroke-width="3"/>
      <path d="M735 246H1080" stroke="url(#rail)" stroke-width="3" class="rail"/>
      <circle cx="735" cy="246" r="5" fill="#E25566"><animate attributeName="cx" values="735;930;1080" keyTimes="0;0.52;1" dur="4.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="4.8s" repeatCount="indefinite"/></circle>
'''
        )
    else:
        for index, pr in enumerate(rows):
            y = 198 + index * 66
            status, color, end_x = status_for(pr)
            repo = compact_repo(pr.get("repository", {}).get("nameWithOwner", "unknown/repository"))
            title = compact_title(pr.get("title", "Untitled pull request"))
            number = pr.get("number", "?")
            additions = int(pr.get("additions") or 0)
            deletions = int(pr.get("deletions") or 0)
            changed_files = int(pr.get("changedFiles") or 0)
            diff = f"+{short_number(additions)}  −{short_number(deletions)}  ·  {changed_files} files"
            date_value = pr.get("mergedAt") or pr.get("updatedAt") or pr.get("createdAt")
            date = format_date(date_value)
            duration = 4.0 + (index % 3) * 0.55
            begin = -(index * 0.72)

            completed_review = end_x >= 930
            completed_merge = end_x >= 1080
            review_fill = color if completed_review else "#0B1825"
            merge_fill = color if completed_merge else "#0B1825"

            row_markup.append(
                f'''
      <g>
        <line x1="48" y1="{y + 48}" x2="1152" y2="{y + 48}" stroke="#1B2E40"/>
        <text x="72" y="{y}" fill="#71879B" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="11" font-weight="700">{esc(repo)} · #{esc(number)}</text>
        <text x="72" y="{y + 25}" fill="#F4F7FA" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="16" font-weight="620">{esc(title)}</text>
        <text x="520" y="{y}" fill="#657C91" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="11">{esc(diff)}</text>
        <text x="520" y="{y + 24}" fill="#657C91" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="11">{esc(date)}</text>

        <rect x="650" y="{y - 13}" width="82" height="25" rx="12.5" fill="{color}" fill-opacity="0.10" stroke="{color}" stroke-opacity="0.75"/>
        <text x="691" y="{y + 4}" text-anchor="middle" fill="{color}" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="10" font-weight="800" letter-spacing="0.8">{status}</text>

        <path d="M780 {y + 12}H1080" stroke="#30465A" stroke-width="2.5"/>
        <circle cx="780" cy="{y + 12}" r="7" fill="{color}" fill-opacity="0.18" stroke="{color}"/>
        <circle cx="930" cy="{y + 12}" r="7" fill="{review_fill}" fill-opacity="0.18" stroke="{color}" stroke-opacity="0.8"/>
        <circle cx="1080" cy="{y + 12}" r="7" fill="{merge_fill}" fill-opacity="0.18" stroke="{color}" stroke-opacity="0.8"/>
        <circle cx="780" cy="{y + 12}" r="4.5" fill="{color}">
          <animate attributeName="cx" values="780;930;{end_x};{end_x}" keyTimes="0;0.42;0.78;1" dur="{duration:.2f}s" begin="{begin:.2f}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.82;1" dur="{duration:.2f}s" begin="{begin:.2f}s" repeatCount="indefinite"/>
        </circle>
        {f'<circle cx="1080" cy="{y + 12}" r="9" fill="none" stroke="{color}" stroke-opacity="0.65"><animate attributeName="r" values="8;16" dur="2.6s" begin="{begin:.2f}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0" dur="2.6s" begin="{begin:.2f}s" repeatCount="indefinite"/></circle>' if completed_merge else ''}
      </g>
'''
            )

    return f'''<svg width="1200" height="{height}" viewBox="0 0 1200 {height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">Recent public pull requests by {esc(username)}</title>
  <desc id="desc">An animated pull-request panel showing recent authored work moving through build, review, and merge.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="{height}" gradientUnits="userSpaceOnUse"><stop stop-color="#09141F"/><stop offset="1" stop-color="#0D1B29"/></linearGradient>
    <linearGradient id="rail" x1="735" y1="0" x2="1080" y2="0" gradientUnits="userSpaceOnUse"><stop stop-color="#A31F34"/><stop offset="0.5" stop-color="#E25566"/><stop offset="1" stop-color="#5EEAD4"/></linearGradient>
    <style>
      .rail {{ stroke-dasharray:7 11; animation:rail 6s linear infinite; }}
      @keyframes rail {{ to {{ stroke-dashoffset:-90; }} }}
      @media (prefers-reduced-motion: reduce) {{ .rail {{ animation:none; }} }}
    </style>
  </defs>
  <rect x="0.75" y="0.75" width="1198.5" height="{height - 1.5}" rx="22.25" fill="url(#bg)" stroke="#263B4E" stroke-width="1.5"/>

  <text x="48" y="53" fill="#5EEAD4" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="12" font-weight="800" letter-spacing="2">PULL REQUEST PULSE</text>
  <text x="48" y="91" fill="#F5F7FA" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="27" font-weight="750">Research moves through review.</text>
  <text x="48" y="119" fill="#8EA3B7" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="14">Latest public PRs authored by @{esc(username)}</text>

  <g transform="translate(775 38)">
    <rect width="112" height="58" rx="13" fill="#101F2D" stroke="#2B4053"/>
    <text x="18" y="24" fill="#71879B" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1">AUTHORED</text>
    <text x="18" y="46" fill="#F5F7FA" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="20" font-weight="750">{short_number(authored)}</text>
  </g>
  <g transform="translate(902 38)">
    <rect width="112" height="58" rx="13" fill="#101F2D" stroke="#2B4053"/>
    <text x="18" y="24" fill="#71879B" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1">MERGED · 12M</text>
    <text x="18" y="46" fill="#F5F7FA" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="20" font-weight="750">{short_number(merged)}</text>
  </g>
  <g transform="translate(1029 38)">
    <rect width="112" height="58" rx="13" fill="#101F2D" stroke="#2B4053"/>
    <text x="18" y="24" fill="#71879B" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1">OPEN</text>
    <text x="18" y="46" fill="#F5F7FA" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="20" font-weight="750">{short_number(opened)}</text>
  </g>

  <rect x="48" y="148" width="1104" height="{max(3, len(rows)) * 66 + 20}" rx="18" fill="#0B1825" stroke="#203448"/>
  <text x="780" y="171" fill="#657C91" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="9" font-weight="700" letter-spacing="1">BUILD</text>
  <text x="930" y="171" text-anchor="middle" fill="#657C91" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="9" font-weight="700" letter-spacing="1">REVIEW</text>
  <text x="1080" y="171" text-anchor="middle" fill="#657C91" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="9" font-weight="700" letter-spacing="1">MERGE</text>
{''.join(row_markup)}
  <text x="48" y="{height - 21}" fill="#536A7F" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="11">Latest activity {esc(latest_activity)} · public authored pull requests</text>
</svg>
'''


def main() -> int:
    args = parse_args()
    output = Path(args.output)
    username = args.username or os.getenv("PROFILE_USERNAME") or os.getenv("GITHUB_REPOSITORY_OWNER")
    if not username:
        print("error: provide --username or set PROFILE_USERNAME/GITHUB_REPOSITORY_OWNER", file=sys.stderr)
        return 2

    try:
        if args.fixture:
            with Path(args.fixture).open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
        else:
            token = os.getenv("PROFILE_GITHUB_TOKEN") or os.getenv("GITHUB_TOKEN")
            if not token:
                raise RuntimeError("GITHUB_TOKEN is not set")
            endpoint = os.getenv("GITHUB_GRAPHQL_URL", "https://api.github.com/graphql")
            payload = github_data(username, token, endpoint)
        svg = render_svg(username, payload)
    except Exception as exc:  # preserve a previously generated panel on transient failure
        if output.exists():
            print(f"warning: {exc}; preserving existing {output}", file=sys.stderr)
            return 0
        print(f"error: {exc}", file=sys.stderr)
        return 1

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(svg, encoding="utf-8")
    print(f"wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
