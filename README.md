# Simple Image Filter Web App

A FastAPI-based web application to apply various filters to images. Users can select a sample animal image or upload their own, choose a filter, and download the result. The app features a modern light/dark theme toggle.

## Features
- Select from sample images (cat, dog, elephant) or upload your own image
- Apply filters: Sharpen, Smoothen, Blur, Edge, Invert Colours, Grayscale
- Download the filtered image
- Modern UI with light/dark theme toggle

## How to Run
1. **Install dependencies** (if not already):
   ```sh
   uv sync
   ```
2. **Start the server:**
   ```sh
   uvicorn main:app --reload
   ```
3. **Open your browser:**
   Go to [http://127.0.0.1:8000](http://127.0.0.1:8000)

## Project Structure
- `main.py` - FastAPI backend
- `filters.py` - Image filter logic and kernels
- `static/` - Frontend (HTML, CSS, JS, images)

## Usage
1. Select a sample animal image or upload your own.
2. Choose a filter from the dropdown.
3. Click "Apply Filter" to see the result.
4. Download the filtered image if desired.
5. Use the theme toggle (top right) to switch between light and dark modes.

---
Built with FastAPI, NumPy, Pillow, and modern web technologies.
