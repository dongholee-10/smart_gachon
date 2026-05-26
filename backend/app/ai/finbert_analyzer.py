import logging
import re
import threading
from typing import Dict

logger = logging.getLogger(__name__)

EN_MODEL = "ProsusAI/finbert"
KR_MODEL = "snunlp/KR-FinBert-SC"

_HANGUL_RE = re.compile(r"[가-힣]")
_lock = threading.Lock()


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
        with _lock:
            # double-checked locking: 다른 스레드가 먼저 로딩했을 수 있음
            if lang in self._pipelines:
                return self._pipelines[lang]
            try:
                from transformers import pipeline

                model_name = KR_MODEL if lang == "kr" else EN_MODEL
                logger.info("FinBERT 모델 로딩 중: %s", model_name)
                self._pipelines[lang] = pipeline("sentiment-analysis", model=model_name)
                logger.info("FinBERT 모델 로딩 완료: %s", model_name)
            except Exception:
                logger.exception("FinBERT 모델 로딩 실패 (lang=%s), 기본값으로 폴백합니다.", lang)
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
        except Exception:
            logger.exception("FinBERT 분석 실패, 기본값으로 폴백합니다.")
            return {"label": "neutral", "score": 0.5}


finbert_analyzer = FinBERTAnalyzer()
