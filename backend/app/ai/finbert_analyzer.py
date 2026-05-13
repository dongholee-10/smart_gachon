from transformers import pipeline


class FinBERTAnalyzer:
    def __init__(self):
        self.model_name = "ProsusAI/finbert"
        self.sentiment_pipeline = None
        self._load_model()

    def _load_model(self):
        """
        Load FinBERT model.
        If model loading fails, the system falls back to neutral sentiment.
        """
        try:
            self.sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model=self.model_name
            )
        except Exception as e:
            print(f"[FinBERT Load Error] {e}")
            self.sentiment_pipeline = None

    def analyze(self, text: str) -> dict:
        """
        Analyze financial sentiment from news text.
        """
        if not text:
            return {
                "label": "neutral",
                "score": 0.5
            }

        if self.sentiment_pipeline is None:
            return {
                "label": "neutral",
                "score": 0.5
            }

        try:
            result = self.sentiment_pipeline(text[:512])[0]

            return {
                "label": result["label"].lower(),
                "score": float(result["score"])
            }

        except Exception as e:
            print(f"[FinBERT Analyze Error] {e}")

            return {
                "label": "neutral",
                "score": 0.5
            }


finbert_analyzer = FinBERTAnalyzer()