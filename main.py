from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

from fastapi import UploadFile, File, Form
from fastapi.responses import Response, JSONResponse
from filters import apply_filter, KERNELS

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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
