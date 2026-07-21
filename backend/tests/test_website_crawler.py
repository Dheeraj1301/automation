from bs4 import BeautifulSoup

from app.services.website_crawler import CrawlResult, _collect_contacts, _find_link, _normalize_url


def test_normalize_url_resolves_relative_paths():
    assert _normalize_url("https://example.com/", "/about") == "https://example.com/about"


def test_normalize_url_rejects_non_http_schemes():
    assert _normalize_url("https://example.com/", "mailto:hi@example.com") is None
    assert _normalize_url("https://example.com/", "javascript:void(0)") is None


def test_find_link_matches_by_url_path_or_link_text():
    links = [("https://example.com/company/about-us", "our story"), ("https://example.com/shop", "shop")]
    assert _find_link(links, ("about", "our-story")) == "https://example.com/company/about-us"


def test_find_link_returns_none_when_no_match():
    links = [("https://example.com/shop", "shop")]
    assert _find_link(links, ("about", "contact")) is None


def test_collect_contacts_extracts_mailto_and_tel_links():
    html = """
    <html><body>
      <a href="mailto:sales@example.com">Email us</a>
      <a href="tel:+15551234567">Call us</a>
      <a href="https://linkedin.com/company/example">LinkedIn</a>
    </body></html>
    """
    soup = BeautifulSoup(html, "lxml")
    result = CrawlResult(success=True)
    _collect_contacts(soup, result)

    assert "sales@example.com" in result.emails
    assert "+15551234567" in result.phones
    assert result.social_links.get("linkedin") == "https://linkedin.com/company/example"


def test_collect_contacts_extracts_plain_text_email():
    html = "<html><body><p>Contact us at hello@example.com for more info.</p></body></html>"
    soup = BeautifulSoup(html, "lxml")
    result = CrawlResult(success=True)
    _collect_contacts(soup, result)

    assert "hello@example.com" in result.emails


def test_collect_contacts_deduplicates_case_insensitively():
    html = """
    <html><body>
      <a href="mailto:Sales@Example.com">Email</a>
      <p>sales@example.com</p>
    </body></html>
    """
    soup = BeautifulSoup(html, "lxml")
    result = CrawlResult(success=True)
    _collect_contacts(soup, result)

    assert len(result.emails) == 1
