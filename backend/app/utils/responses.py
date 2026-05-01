"""
Standardised JSON response helpers.
All API responses follow the same envelope: { success, data } or { success, message }.
"""
from fastapi.responses import JSONResponse
from typing import Any


def ok(data: Any, status: int = 200) -> JSONResponse:
    return JSONResponse(status_code=status, content={"success": True, "data": data})


def ok_msg(message: str) -> JSONResponse:
    return JSONResponse(status_code=200, content={"success": True, "message": message})


def ok_page(data: list, meta: dict) -> JSONResponse:
    return JSONResponse(
        status_code=200,
        content={"success": True, "data": data, "meta": meta},
    )


def fail(message: str, status: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"success": False, "message": message},
    )
