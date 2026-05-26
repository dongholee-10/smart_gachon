import re


def clean_html(text: str) -> str:
    """
    Remove HTML tags from Naver News API response.
    Example:
    <b>삼성전자</b> -> 삼성전자
    """
    if not text:
        return ""

    clean_pattern = re.compile("<.*?>")
    return re.sub(clean_pattern, "", text)