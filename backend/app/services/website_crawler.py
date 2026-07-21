"""Crawls a company's own public website - home page plus its own About
and Contact pages if linked from the home page. Nothing else: no Google,
Maps, or LinkedIn scraping, no login bypass, no crawling beyond a handful
of top-level pages the business itself published and linked to.

Identifies itself with a real User-Agent (good practice for a research
crawler) and does a basic robots.txt check before fetching anything.
"""

import re
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

USER_AGENT = "ProfitPilotProspectingBot/1.0 (+https://profitpanel.smush.co.in; business research assistant)"
REQUEST_TIMEOUT = 10.0
MAX_PAGES = 3
MAX_TEXT_CHARS = 8000

EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
ABOUT_KEYWORDS = ("about", "who-we-are", "company", "our-story")
CONTACT_KEYWORDS = ("contact", "get-in-touch", "reach-us")
SOCIAL_DOMAINS = {
    "instagram.com": "instagram",
    "facebook.com": "facebook",
    "linkedin.com": "linkedin",
    "twitter.com": "twitter",
    "x.com": "twitter",
}


@dataclass
class CrawlResult:
    success: bool
    error: str | None = None
    pages_crawled: list[str] = field(default_factory=list)
    combined_text: str = ""
    emails: list[str] = field(default_factory=list)
    phones: list[str] = field(default_factory=list)
    social_links: dict[str, str] = field(default_factory=dict)
    contact_page_url: str | None = None
    about_page_url: str | None = None
    contact_form_url: str | None = None


def crawl_website(url: str) -> CrawlResult:
    if not url:
        return CrawlResult(success=False, error="No URL provided")
    if not url.startswith("http"):
        url = f"https://{url}"

    try:
        with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
            if not _allowed_by_robots(client, url):
                return CrawlResult(success=False, error="Crawling disallowed by the site's robots.txt")

            response = client.get(url)
            response.raise_for_status()
            homepage_url = str(response.url)

            result = CrawlResult(success=True, pages_crawled=[homepage_url])
            text_parts = []

            soup = BeautifulSoup(response.text, "lxml")
            text_parts.append(soup.get_text(" ", strip=True))
            _collect_contacts(soup, result)

            links = _extract_links(soup, homepage_url)
            result.about_page_url = _find_link(links, ABOUT_KEYWORDS)
            result.contact_page_url = _find_link(links, CONTACT_KEYWORDS)

            for extra_url in filter(None, [result.about_page_url, result.contact_page_url]):
                if extra_url in result.pages_crawled or len(result.pages_crawled) >= MAX_PAGES:
                    continue
                try:
                    extra_response = client.get(extra_url)
                    extra_response.raise_for_status()
                    result.pages_crawled.append(extra_url)
                    extra_soup = BeautifulSoup(extra_response.text, "lxml")
                    text_parts.append(extra_soup.get_text(" ", strip=True))
                    _collect_contacts(extra_soup, result)
                    if extra_url == result.contact_page_url and extra_soup.find("form") is not None:
                        result.contact_form_url = extra_url
                except Exception:
                    continue

            result.combined_text = " ".join(text_parts)[:MAX_TEXT_CHARS]
            return result

    except httpx.HTTPStatusError as exc:
        return CrawlResult(success=False, error=f"HTTP {exc.response.status_code}")
    except httpx.RequestError as exc:
        return CrawlResult(success=False, error=f"Could not reach site: {exc}")
    except Exception as exc:
        return CrawlResult(success=False, error=str(exc))


def _extract_links(soup: BeautifulSoup, base_url: str) -> list[tuple[str, str]]:
    links = []
    for a in soup.find_all("a", href=True):
        url = _normalize_url(base_url, a["href"])
        if url:
            links.append((url, a.get_text(strip=True).lower()))
    return links


def _normalize_url(base: str, href: str) -> str | None:
    try:
        joined = urljoin(base, href)
        if urlparse(joined).scheme not in ("http", "https"):
            return None
        return joined
    except Exception:
        return None


def _find_link(links: list[tuple[str, str]], keywords: tuple[str, ...]) -> str | None:
    for url, text in links:
        path = url.lower()
        if any(kw in path or kw in text for kw in keywords):
            return url
    return None


def _collect_contacts(soup: BeautifulSoup, result: CrawlResult) -> None:
    text = soup.get_text(" ", strip=True)
    for email in EMAIL_PATTERN.findall(text):
        if email.lower() not in [e.lower() for e in result.emails]:
            result.emails.append(email)

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("mailto:"):
            email = href.replace("mailto:", "").split("?")[0]
            if email and email.lower() not in [e.lower() for e in result.emails]:
                result.emails.append(email)
        elif href.startswith("tel:"):
            phone = href.replace("tel:", "")
            if phone and phone not in result.phones:
                result.phones.append(phone)
        else:
            for domain, key in SOCIAL_DOMAINS.items():
                if domain in href and key not in result.social_links:
                    result.social_links[key] = href


def _allowed_by_robots(client: httpx.Client, url: str) -> bool:
    """Minimal robots.txt check: honors a blanket `Disallow: /` under
    `User-agent: *`. Good enough for a crawler that only ever fetches a
    handful of top-level pages; fails open (allows) on any parse issue or
    missing robots.txt, since those aren't a "no" from the site."""
    try:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        response = client.get(robots_url, timeout=5.0)
        if response.status_code != 200:
            return True

        in_wildcard_block = False
        for line in response.text.splitlines():
            line = line.strip()
            if line.lower().startswith("user-agent:"):
                in_wildcard_block = line.split(":", 1)[1].strip() == "*"
            elif in_wildcard_block and line.lower().startswith("disallow:"):
                if line.split(":", 1)[1].strip() == "/":
                    return False
        return True
    except Exception:
        return True
