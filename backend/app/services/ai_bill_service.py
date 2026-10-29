import base64
import json
import os
import httpx
from fastapi import HTTPException

# In-memory cached model list to avoid repeated ListModels network roundtrips
_CACHED_MODELS: list[str] = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash-exp"
]

async def refresh_available_gemini_models(key: str) -> list[str]:
    """Fetch valid model names dynamically for this key if preferred model fails."""
    global _CACHED_MODELS
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={key}")
            if resp.status_code == 200:
                data = resp.json()
                models = data.get("models", [])
                discovered = []
                for m in models:
                    methods = m.get("supportedGenerationMethods", [])
                    if "generateContent" in methods:
                        discovered.append(m["name"].replace("models/", ""))

                if discovered:
                    flash_models = [m for m in discovered if "flash" in m.lower()]
                    pro_models = [m for m in discovered if "pro" in m.lower()]
                    other_models = [m for m in discovered if m not in flash_models and m not in pro_models]
                    _CACHED_MODELS = flash_models + pro_models + other_models
                    return _CACHED_MODELS
            elif resp.status_code == 400:
                err_msg = resp.json().get("error", {}).get("message", "API key invalid")
                raise HTTPException(status_code=400, detail=f"Google Gemini Error: {err_msg}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"ListModels refresh exception: {e}")
    return _CACHED_MODELS

async def parse_receipt_with_gemini(
    api_key: str | None,
    image_bytes: bytes,
    mime_type: str = "image/jpeg"
) -> dict:
    global _CACHED_MODELS
    key = (api_key or "").strip() or os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=400,
            detail="Gemini API Key is required. Please provide your free Gemini API key in Settings or the bill scanner."
        )

    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    prompt = """You are an expert receipt parser.
Analyze this receipt image (delivery app screenshot like Blinkit/Zepto/Instamart, or a paper slip).
Read all purchased items, individual item prices, extra delivery/surge charges, handling fees, and discounts accurately.

Extract:
1. storeName: Name of the merchant or store (e.g. Blinkit, Zepto, Swiggy Instamart, D-Mart, Supermarket, Restaurant).
2. category: One of "Blinkit", "Groceries", "Food", "Travel", "Household", "Other".
3. date: Receipt date in "YYYY-MM-DD" format (infer current year 2026 if not specified).
4. items: Array of purchased grocery or menu items.
   - For each item:
     "name": item title (e.g. "Imported Litchi (Longan)", "Mangalore Mint Leaves")
     "amount": final price for that item as a float (e.g. 46.0, 10.0, 99.0, 89.0, 9.0, 32.0, 15.0)
   - CRITICAL: DO NOT include "Item Bill", "Subtotal", "Total Order Bill Details", "Bill Details", "Grand Total", or fee lines inside "items"!
5. deliveryFee: Sum of Delivery Fee and Demand Surge Fee if present (float). If none, 0.0.
6. handlingFee: Handling charge / fee / packaging charge / platform fee if present (e.g. 7.0 or 7.01). If none, 0.0.
7. discount: Offer discount, coupon, or promotional savings as a positive float (e.g. 46.0). If none, 0.0.

Format your output as strict JSON with this exact schema:
{
  "storeName": "Blinkit",
  "category": "Blinkit",
  "date": "2026-10-28",
  "deliveryFee": 46.0,
  "handlingFee": 7.0,
  "discount": 46.0,
  "items": [
    {
      "name": "Imported Litchi (Longan)",
      "amount": 46.0
    }
  ]
}"""

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": base64_image
                    }
                }
            ]
        }],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
            "response_mime_type": "application/json"
        }
    }

    errors = []
    models_to_try = list(_CACHED_MODELS)
    tried_refresh = False

    async with httpx.AsyncClient(timeout=25.0) as client:
        i = 0
        while i < len(models_to_try):
            model_name = models_to_try[i]
            i += 1
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text_content = candidates[0]["content"]["parts"][0]["text"]
                        clean_text = text_content.strip()
                        if clean_text.startswith("```json"):
                            clean_text = clean_text[7:]
                        elif clean_text.startswith("```"):
                            clean_text = clean_text[3:]
                        if clean_text.endswith("```"):
                            clean_text = clean_text[:-3]
                        clean_text = clean_text.strip()

                        parsed = json.loads(clean_text)

                        # Pin winning model to index 0 so subsequent calls run at maximum speed
                        if model_name in _CACHED_MODELS:
                            _CACHED_MODELS.remove(model_name)
                        _CACHED_MODELS.insert(0, model_name)

                        return {
                            "storeName": parsed.get("storeName") or "Blinkit",
                            "category": parsed.get("category") or "Blinkit",
                            "date": parsed.get("date"),
                            "deliveryFee": float(parsed.get("deliveryFee") or 0),
                            "handlingFee": float(parsed.get("handlingFee") or 0),
                            "discount": float(parsed.get("discount") or 0),
                            "items": parsed.get("items") or []
                        }
                else:
                    err_body = resp.text
                    try:
                        err_json = resp.json()
                        err_msg = err_json.get("error", {}).get("message", err_body)
                    except Exception:
                        err_msg = err_body
                    errors.append(f"{model_name}: {err_msg}")

                    if not tried_refresh:
                        tried_refresh = True
                        fresh_models = await refresh_available_gemini_models(key)
                        for m in fresh_models:
                            if m not in models_to_try:
                                models_to_try.append(m)
            except Exception as e:
                errors.append(f"{model_name}: {str(e)}")

    primary_error = errors[0] if errors else "No response from Gemini API"
    raise HTTPException(status_code=500, detail=f"Gemini AI parsing failed: {primary_error}")
