"""Small helpers for converting raw DB rows into plain-Python dicts.

asyncpg returns `uuid` columns as `uuid.UUID` objects, but every Pydantic
schema in this app declares id/FK fields as `str`, and application code
compares ids across rows (e.g. `requester_id == profile["id"]`). Mixing UUID
objects and strings would silently break those comparisons — `uuid.UUID.__eq__`
never matches a plain string — as well as response serialization. Route every
raw-SQL row through `row_dict`/`row_dicts` before handing it to a Pydantic
model or comparing it against a str id.
"""

import uuid
from typing import Any, Mapping


def _coerce(value: Any) -> Any:
    return str(value) if isinstance(value, uuid.UUID) else value


def row_dict(row: Mapping) -> dict:
    return {k: _coerce(v) for k, v in dict(row).items()}


def row_dicts(rows: list[Mapping]) -> list[dict]:
    return [row_dict(r) for r in rows]
