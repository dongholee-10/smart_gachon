from typing import Any, Dict, List, Optional
from datetime import datetime

fake_db: Dict[int, Dict[str, Any]] = {}
current_id = 1


def save_analysis_result(result: dict) -> dict:
    """
    Save analysis result into in-memory repository.
    This can be replaced with PostgreSQL or MongoDB later.
    """
    global current_id

    result["id"] = current_id
    result["created_at"] = datetime.now().isoformat()

    fake_db[current_id] = result
    current_id += 1

    return result


def get_analysis_result(result_id: int) -> Optional[dict]:
    """Retrieve analysis result by ID."""
    return fake_db.get(result_id)


def get_all_analysis_results() -> List[dict]:
    """Retrieve all stored analysis results."""
    return list(fake_db.values())
