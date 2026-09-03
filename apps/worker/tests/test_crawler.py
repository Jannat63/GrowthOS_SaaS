from unittest.mock import patch, MagicMock
import socket

import pytest
import requests

from app.crawler import audit_page, crawl_site, _assert_public_host, UnsafeUrlError


def _mock_response(html: str, status_code: int = 200, content_type: str = "text/html", history=None):
    resp = MagicMock(spec=requests.Response)
    resp.status_code = status_code
    resp.headers = {"Content-Type": content_type}
    resp.history = history or []
    resp.encoding = "utf-8"
    raw = MagicMock()
    body = html.encode("utf-8")
    raw.read.return_value = body
    resp.raw = raw
    return resp


GOOD_HTML = """
<html><head>
<title>A Perfectly Fine Page Title</title>
<meta name="description" content="A good description of the page.">
<link rel="canonical" href="https://example.com/page">
</head><body>
<h1>Main heading</h1>
<p>{}</p>
<a href="/about">About</a>
<a href="https://other-domain.com/x">External</a>
<img src="/logo.png" alt="Logo">
</body></html>
""".format(" ".join(["word"] * 320))

THIN_HTML = "<html><head><title>T</title></head><body><h1>H</h1><p>short</p></body></html>"


@pytest.fixture(autouse=True)
def _allow_public_host():
    # Every test URL uses example.com; resolve it as if it were a public IP so tests never
    # depend on real DNS/network in this sandbox — the SSRF guard itself is tested separately.
    with patch("app.crawler._assert_public_host", return_value=None):
        yield


def test_audit_page_healthy_page_has_no_issues():
    with patch("app.crawler.requests.get", return_value=_mock_response(GOOD_HTML)):
        result = audit_page("https://example.com/")
    assert result.issues == []
    assert result.title == "A Perfectly Fine Page Title"
    assert result.has_canonical is True
    assert result.h1_count == 1
    assert "https://example.com/about" in result.internal_links
    assert "https://other-domain.com/x" not in result.internal_links  # not same domain


def test_audit_page_flags_real_problems():
    with patch("app.crawler.requests.get", return_value=_mock_response(THIN_HTML)):
        result = audit_page("https://example.com/thin")
    assert "Missing meta description" in result.issues
    assert "Missing canonical tag" in result.issues
    assert any("Thin content" in i for i in result.issues)


def test_audit_page_rejects_non_html():
    with patch("app.crawler.requests.get", return_value=_mock_response("", content_type="application/pdf")):
        result = audit_page("https://example.com/file.pdf")
    assert result.issues == ["Not HTML (Content-Type: application/pdf)"]
    assert result.title is None


def test_audit_page_handles_request_failure_without_raising():
    with patch("app.crawler.requests.get", side_effect=requests.ConnectionError("boom")):
        result = audit_page("https://example.com/down")
    assert result.status_code is None
    assert "Request failed" in result.issues[0]


def test_audit_page_enforces_size_cap():
    huge = _mock_response(GOOD_HTML)
    huge.raw.read.return_value = b"x" * (5 * 1024 * 1024 + 1)
    with patch("app.crawler.requests.get", return_value=huge):
        result = audit_page("https://example.com/huge")
    assert "exceeded" in result.issues[0]


def test_crawl_site_follows_internal_links_and_respects_max_pages():
    home = _mock_response(
        '<html><head><title>Home</title><meta name="description" content="d">'
        '<link rel="canonical" href="https://example.com/"></head>'
        '<body><h1>Home</h1><p>{}</p><a href="/page-1">1</a><a href="/page-2">2</a></body></html>'.format(
            " ".join(["word"] * 320)
        )
    )
    other = _mock_response(GOOD_HTML)  # reused for every linked page

    def fake_get(url, **kwargs):
        return home if url == "https://example.com/" else other

    with patch("app.crawler.requests.get", side_effect=fake_get):
        results = crawl_site("https://example.com/", max_pages=2)
    assert len(results) == 2  # capped, even though 3 URLs were discovered
    assert results[0].url == "https://example.com/"


def test_ssrf_guard_rejects_private_addresses(monkeypatch):
    def fake_getaddrinfo(host, port):
        return [(socket.AF_INET, None, None, "", ("127.0.0.1", 0))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)
    with pytest.raises(UnsafeUrlError):
        _assert_public_host("https://internal.example/")
