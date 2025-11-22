from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from pdf_reader import extract_pdf, parse_page_spec

app = FastAPI(title="PDF Reader MCP Service", version="1.0.0")


class ExtractRequest(BaseModel):
    pdf_path: str
    pages: Optional[str] = None


class ExtractResponse(BaseModel):
    pdf_path: str
    total_pages: int
    extracted_pages: list[int]
    pages_data: list[dict]


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "pdf_reader"}


@app.post("/extract", response_model=ExtractResponse)
def extract(req: ExtractRequest) -> ExtractResponse:
    """Extract text and metadata from PDF file."""
    try:
        pdf_path = Path(req.pdf_path)
        if not pdf_path.is_file():
            raise HTTPException(status_code=404, detail=f"PDF not found: {req.pdf_path}")

        # Parse page spec if provided
        page_numbers = None
        if req.pages:
            page_numbers = parse_page_spec(req.pages)

        # Extract PDF
        extraction = extract_pdf(pdf_path, page_numbers=page_numbers)
        extraction_dict = extraction.as_dict()

        # Build extracted_pages list from pages data
        extracted_pages = [page["page_number"] for page in extraction_dict["pages"]]

        return ExtractResponse(
            pdf_path=str(pdf_path),
            total_pages=extraction_dict["page_count"],
            extracted_pages=extracted_pages,
            pages_data=extraction_dict["pages"],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
