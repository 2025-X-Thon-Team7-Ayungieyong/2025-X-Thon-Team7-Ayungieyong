from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Sequence, Union

import fitz  # PyMuPDF


@dataclass
class PageContent:
    page_number: int  # 1-based
    text: str


@dataclass
class PDFExtraction:
    path: Path
    page_count: int
    pages: List[PageContent]
    metadata: dict

    def as_dict(self) -> dict:
        return {
            "path": str(self.path),
            "page_count": self.page_count,
            "metadata": self.metadata,
            "pages": [
                {"page_number": page.page_number, "text": page.text} for page in self.pages
            ],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "PDFExtraction":
        """Reconstruct PDFExtraction from dictionary."""
        pages = [
            PageContent(page_number=p["page_number"], text=p["text"])
            for p in data.get("pages", [])
        ]
        return cls(
            path=Path(data["path"]),
            page_count=data["page_count"],
            pages=pages,
            metadata=data.get("metadata", {}),
        )


def extract_pdf(
    file_path: Union[str, Path], page_numbers: Optional[Sequence[int]] = None
) -> PDFExtraction:
    """Extract text and metadata from a PDF."""
    path = _normalize_path(file_path)
    with fitz.open(path) as doc:
        page_indices = _resolve_page_indices(page_numbers, doc.page_count)
        pages = [_read_page(doc, idx) for idx in page_indices]
        metadata = doc.metadata or {}
        return PDFExtraction(path=path, page_count=doc.page_count, pages=pages, metadata=metadata)


def parse_page_spec(spec: str) -> List[int]:
    """
    Parse a comma-separated page spec (e.g., "1,3-5") into a sorted list of 1-based page numbers.
    """
    if not spec:
        return []

    numbers = set()
    for raw in spec.split(","):
        part = raw.strip()
        if not part:
            continue
        if "-" in part:
            start_str, end_str = part.split("-", 1)
            start, end = _to_positive_int(start_str), _to_positive_int(end_str)
            if start > end:
                raise ValueError(f"Invalid range '{part}': start greater than end.")
            numbers.update(range(start, end + 1))
        else:
            numbers.add(_to_positive_int(part))
    return sorted(numbers)


def _normalize_path(file_path: Union[str, Path]) -> Path:
    path = Path(file_path).expanduser().resolve()
    if not path.is_file():
        raise FileNotFoundError(f"PDF not found: {path}")
    if path.suffix.lower() != ".pdf":
        raise ValueError(f"Expected a PDF file, got: {path.suffix}")
    return path


def _resolve_page_indices(page_numbers: Optional[Sequence[int]], total_pages: int) -> List[int]:
    if total_pages < 1:
        return []
    if page_numbers is None or len(page_numbers) == 0:
        return list(range(total_pages))

    indices = []
    seen = set()
    for page_num in page_numbers:
        if page_num < 1 or page_num > total_pages:
            raise ValueError(f"Page number {page_num} is out of range (1-{total_pages}).")
        idx = page_num - 1
        if idx not in seen:
            indices.append(idx)
            seen.add(idx)
    return indices


def _read_page(doc: fitz.Document, page_index: int) -> PageContent:
    page = doc.load_page(page_index)
    text = page.get_text("text") or ""
    return PageContent(page_number=page_index + 1, text=text.strip())


def _to_positive_int(value: Union[str, int]) -> int:
    if isinstance(value, int):
        if value <= 0:
            raise ValueError(f"Page numbers must be positive: {value}")
        return value
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid page spec token: {value}") from exc
    if number <= 0:
        raise ValueError(f"Page numbers must be positive: {number}")
    return number


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Extract text and metadata from a PDF.")
    parser.add_argument("path", help="Path to the PDF file.")
    parser.add_argument(
        "--pages",
        help='Optional comma/range list of pages (1-based), e.g., "1,3-5".',
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="JSON indent level for stdout output (default: 2).",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> None:
    parser = _build_parser()
    args = parser.parse_args(argv)
    page_numbers = parse_page_spec(args.pages) if args.pages else None
    extraction = extract_pdf(args.path, page_numbers=page_numbers)
    out = _stdout()
    json.dump(extraction.as_dict(), fp=out, ensure_ascii=False, indent=args.indent)
    out.write("\n")


def _stdout():
    # Lazy import to keep module import light for MCP integration.
    import sys

    return sys.stdout


if __name__ == "__main__":
    main()
