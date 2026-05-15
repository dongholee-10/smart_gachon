import re
from typing import Dict

EN_MODEL = "ProsusAI/finbert"
KR_MODEL = "snunlp/KR-FinBert-SC"

_HANGUL_RE = re.compile(r"[가-힣]")


def _is_korean(text: str) -> bool:
    if not text:
        return False
    hangul_chars = len(_HANGUL_RE.findall(text))
    return hangul_chars >= max(3, len(text) * 0.1)


def _normalize_label(label: str) -> str:
    label = (label or "").lower()
    if label in {"positive", "pos", "긍정", "label_2"}:
        return "positive"
    if label in {"negative", "neg", "부정", "label_0"}:
        return "negative"
    return "neutral"


class FinBERTAnalyzer:
    def __init__(self):
        self._pipelines: Dict[str, object] = {}

    def _get_pipeline(self, lang: str):
        if lang in self._pipelines:
            return self._pipelines[lang]
        try:
            from transformers import pipeline

            model_name = KR_MODEL if lang == "kr" else EN_MODEL
            self._pipelines[lang] = pipeline("sentiment-analysis", model=model_name)
        except Exception as e:
            print(f"[FinBERT Load Error / {lang}] {e}")
            self._pipelines[lang] = None
        return self._pipelines[lang]

    def analyze(self, text: str) -> dict:
        if not text:
            return {"label": "neutral", "score": 0.5}

        lang = "kr" if _is_korean(text) else "en"
        pipe = self._get_pipeline(lang)

        if pipe is None:
            return {"label": "neutral", "score": 0.5}

        try:
            result = pipe(text[:512])[0]
            return {
                "label": _normalize_label(result["label"]),
                "score": float(result["score"]),
            }
        except Exception as e:
            print(f"[FinBERT Analyze Error] {e}")
            return {"label": "neutral", "score": 0.5}


finbert_analyzer = FinBERTAnalyzer()
