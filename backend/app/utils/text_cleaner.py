import html
import re


def clean_html(text: str) -> str:
    """Remove HTML tags and decode HTML entities from Naver News API response."""
    if not text:
        return ""
    # 태그 제거 후 HTML 엔티티 디코딩 (&amp; → &, &lt; → < 등)
    no_tags = re.sub(r"<[^>]+>", "", text)
    return html.unescape(no_tags)
