"""
Script test nhanh luong API -> n8n cho KB endpoints.

Mac dinh script goi vao FastAPI local:
    python test_api_n8n.py

Test batch:
    python test_api_n8n.py --mode batch

Test endpoint upload:
    python test_api_n8n.py --mode upload --file sample_qa.csv

Co the doi base URL:
    python test_api_n8n.py --base-url http://localhost:8000
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import requests


DEFAULT_BASE_URL = "http://localhost:8000"


def build_single_payload() -> dict:
    return {
        "version": "v5",
        "department": "hoc vu",
        "question": "Lich thi cap tinh thang 3 o dau?",
        "answer": "Ban xem muc Lich thi trong he thong noi bo.",
    }


def build_batch_payload() -> dict:
    return {
        "version": "v5",
        "department": "hoc vu",
        "items": [
            {
                "question": "Lich thi cap tinh thang 3 o dau?",
                "answer": "Ban xem muc Lich thi trong he thong noi bo.",
            },
            {
                "question": "Cach doi mat khau tai khoan nhu the nao?",
                "answer": "Vao phan Tai khoan va chon Doi mat khau.",
            },
        ],
    }


def ensure_sample_file(path: Path) -> Path:
    if path.exists():
        return path

    path.write_text(
        "question,answer\n"
        "\"Lich thi cap tinh thang 3 o dau?\",\"Ban xem muc Lich thi trong he thong noi bo.\"\n"
        "\"Cach doi mat khau tai khoan nhu the nao?\",\"Vao phan Tai khoan va chon Doi mat khau.\"\n",
        encoding="utf-8",
    )
    return path


def print_request(label: str, url: str, payload: dict | None = None) -> None:
    print(f"\n=== {label} ===")
    print(f"URL: {url}")
    if payload is not None:
        print("Payload:")
        print(json.dumps(payload, ensure_ascii=False, indent=2))


def print_response(response: requests.Response) -> None:
    print(f"Status code: {response.status_code}")
    try:
        print("Response JSON:")
        print(json.dumps(response.json(), ensure_ascii=False, indent=2))
    except Exception:
        print("Response text:")
        print(response.text)


def test_single(base_url: str, timeout: int) -> int:
    url = f"{base_url.rstrip('/')}/api/kb/single"
    payload = build_single_payload()
    print_request("TEST SINGLE", url, payload)
    response = requests.post(url, json=payload, timeout=timeout)
    print_response(response)
    return 0 if response.ok else 1


def test_batch(base_url: str, timeout: int) -> int:
    url = f"{base_url.rstrip('/')}/api/kb/batch"
    payload = build_batch_payload()
    print_request("TEST BATCH", url, payload)
    response = requests.post(url, json=payload, timeout=timeout)
    print_response(response)
    return 0 if response.ok else 1


def test_upload(base_url: str, timeout: int, file_path: Path) -> int:
    url = f"{base_url.rstrip('/')}/api/kb/upload"
    ensure_sample_file(file_path)
    params = {
        "version": "v5",
        "department": "hoc vu",
    }
    print_request("TEST UPLOAD", url, params)
    with file_path.open("rb") as f:
        files = {"file": (file_path.name, f, "text/csv")}
        response = requests.post(url, params=params, files=files, timeout=timeout)
    print_response(response)
    return 0 if response.ok else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Test luong API -> n8n cho KB.")
    parser.add_argument(
        "--mode",
        choices=["single", "batch", "upload"],
        default="single",
        help="Chon endpoint can test.",
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help="Base URL cua FastAPI. Mac dinh: http://localhost:8000",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=60,
        help="Timeout request tinh bang giay.",
    )
    parser.add_argument(
        "--file",
        type=Path,
        default=Path("sample_qa.csv"),
        help="File dung cho mode upload. Neu chua ton tai script se tao mau.",
    )
    args = parser.parse_args()

    if args.mode == "single":
        return test_single(args.base_url, args.timeout)
    if args.mode == "batch":
        return test_batch(args.base_url, args.timeout)
    return test_upload(args.base_url, args.timeout, args.file)


if __name__ == "__main__":
    raise SystemExit(main())
