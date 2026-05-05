"""
Standardised JSON response helpers.
All API responses follow the same envelope: 
Success: { "success": true, "data": ... } or { "success": true, "message": "..." }
Error:   { "success": false, "message": "..." }
"""
from fastapi.responses import JSONResponse
from typing import Any


def ok(data: Any, status: int = 200) -> JSONResponse:
    """Standard success response with a data payload."""
    return JSONResponse(
        status_code=status, 
        content={"success": True, "data": data}
    )


def ok_list(data: Any, status: int = 200) -> JSONResponse:
    """Standard success response for lists, ensuring an array is returned."""
    if data is None or not isinstance(data, list):
        data = []
    return JSONResponse(
        status_code=status, 
        content={"success": True, "data": data}
    )


def ok_msg(message: str) -> JSONResponse:
    """Standard success response with a message instead of data."""
    return JSONResponse(
        status_code=200, 
        content={"success": True, "message": message}
    )


def ok_page(data: list, meta: dict) -> JSONResponse:
    """Standard success response for paginated results."""
    if data is None or not isinstance(data, list):
        data = []
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "data": data,
            "pagination": meta
        },
    )


def fail(message: str, status: int = 400) -> JSONResponse:
    """Standard error response."""
    return JSONResponse(
        status_code=status,
        content={"success": False, "message": message},
    )
