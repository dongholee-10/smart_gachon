def generate_explanation(
    sentiment_label: str,
    sentiment_score: float,
    risk_level: str,
    risk_score: int,
    risk_factors: list
) -> str:
    """
    Generate natural language explanation.

    This module is designed as an LLM-compatible component.
    In this prototype, it uses template-based reasoning.
    It can be replaced with OpenAI, Qwen, Llama, or other LLM APIs in future work.
    """

    base = (
        f"The news sentiment is classified as {sentiment_label} "
        f"with a confidence score of {sentiment_score:.2f}. "
        f"The calculated risk score is {risk_score}/100, "
        f"which corresponds to a {risk_level} risk level. "
    )

    if not risk_factors:
        return (
            base
            + "No explicit red flag keywords were detected. "
            + "Therefore, the overall risk appears limited based on the current news text."
        )

    factor_descriptions = []

    for factor in risk_factors:
        factor_descriptions.append(
            f"{factor['category']} risk was detected from the keyword '{factor['keyword']}'"
        )

    factor_text = "; ".join(factor_descriptions)

    explanation = (
        base
        + f"The system detected the following red flag signals: {factor_text}. "
    )

    if risk_level == "High":
        explanation += (
            "This suggests that the company may be facing serious potential risks. "
            "Investors should carefully monitor whether these issues affect legal stability, "
            "regulatory compliance, financial performance, or market confidence."
        )
    elif risk_level == "Medium":
        explanation += (
            "This indicates a moderate level of uncertainty. "
            "The issue may not immediately imply severe damage, but it should be monitored "
            "because it could affect investor sentiment or future performance."
        )
    else:
        explanation += (
            "The detected risk appears relatively limited. "
            "However, the news should still be interpreted together with additional financial data."
        )

    return explanation