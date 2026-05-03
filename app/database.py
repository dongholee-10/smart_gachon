from typing import Dict, Any, Optional

fake_db: Dict[int, Any] = {}
current_id = 1


def save_result(result: dict) -> dict:
    global current_id

    result["id"] = current_id
    fake_db[current_id] = result
    current_id += 1

    return result


def get_result(result_id: int) -> Optional[dict]:
    return fake_db.get(result_id)


def get_all_results() -> list:
    return list(fake_db.values())