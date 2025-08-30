from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

from fastapi import UploadFile, File, Form, Request
from fastapi.responses import Response, JSONResponse
from filters import apply_filter, KERNELS
import httpx
from dotenv import load_dotenv  # NEW

# Load .env file if present
load_dotenv()

app = FastAPI()

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve the frontend
@app.get("/")
def read_index():
    return FileResponse(os.path.join("static", "index.html"))

# API endpoint to apply filter
@app.post("/api/filter")
async def filter_image(
    file: UploadFile = File(...),
    filter_name: str = Form(...)
):
    if filter_name not in KERNELS:
        return JSONResponse({"error": "Unknown filter"}, status_code=400)
    image_bytes = await file.read()
    filtered_bytes = apply_filter(image_bytes, KERNELS[filter_name])
    return Response(filtered_bytes, media_type="image/png")

# Chat proxy to Google Generative Language (Gemini) API
@app.post("/api/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    prompt = data.get('prompt') if isinstance(data, dict) else None
    if not prompt or not isinstance(prompt, str):
        return JSONResponse({"error": "Missing or invalid prompt"}, status_code=400)

    api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    if not api_key:
        return JSONResponse({"error": "Server misconfigured: missing GEMINI_API_KEY"}, status_code=500)

    model = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
    print(f"Using model: {model}, API key prefix: {api_key[:4]}***")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"maxOutputTokens": 512}}
    headers = {"X-goog-api-key": api_key, "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                return JSONResponse({
                    "error": "Upstream request failed",
                    "status_code": resp.status_code,
                    "response": resp.text
                }, status_code=502)
            j = resp.json()
    except httpx.HTTPError as e:
        return JSONResponse({"error": "Upstream request failed", "details": str(e)}, status_code=502)

    # Parse Gemini 2.x/1.5 output structure
    output_text = None
    if isinstance(j, dict):
        # Gemini 2.x/1.5: candidates[0].content.parts[0].text
        if 'candidates' in j and isinstance(j['candidates'], list) and j['candidates']:
            cand = j['candidates'][0]
            if isinstance(cand, dict):
                content = cand.get('content')
                if isinstance(content, dict):
                    parts = content.get('parts')
                    if isinstance(parts, list) and parts and isinstance(parts[0], dict):
                        output_text = parts[0].get('text')
                # fallback: if content is str
                if not output_text and isinstance(content, str):
                    output_text = content
            if not output_text:
                # fallback: try cand['output'] or str
                output_text = cand.get('output') or str(cand)
        # older outputs shape
        elif 'outputs' in j and isinstance(j['outputs'], list) and j['outputs']:
            out0 = j['outputs'][0]
            if isinstance(out0, dict):
                output_text = out0.get('content') or out0.get('text') or None
                if not output_text and isinstance(out0.get('content'), list):
                    pieces = []
                    for seg in out0.get('content'):
                        if isinstance(seg, dict) and 'text' in seg:
                            pieces.append(seg['text'])
                    output_text = ' '.join(pieces) if pieces else None
            else:
                output_text = str(out0)
        elif 'output' in j:
            output_text = j.get('output')
        elif 'text' in j:
            output_text = j.get('text')
        else:
            output_text = str(j)

    if not output_text:
        output_text = 'No response from model.'

    # Keep server-side responses reasonable in size
    if len(output_text) > 4000:
        output_text = output_text[:4000] + '…'

    return JSONResponse({"output": output_text})

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
