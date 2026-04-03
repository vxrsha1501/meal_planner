import re

try:
    from rapidocr_onnxruntime import RapidOCR
except Exception:  # pragma: no cover
    RapidOCR = None


def extract_total_amount(text: str) -> float:
    values = []
    for match in re.findall(r"(?:rs\.?|inr|total|amount|\u20b9)?\s*([0-9]+(?:\.[0-9]{1,2})?)", text.lower()):
        try:
            values.append(float(match))
        except ValueError:
            continue

    return round(max(values), 2) if values else 0.0


def perform_ocr(file_bytes: bytes) -> str:
    if RapidOCR is None:
        return ""

    engine = RapidOCR()
    result, _ = engine(file_bytes)
    if not result:
        return ""

    return "\n".join([line[1] for line in result if len(line) > 1])
