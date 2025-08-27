import numpy as np
from PIL import Image
from fastapi import UploadFile
import io

def apply_filter(image_bytes: bytes, kernel_or_type) -> bytes:
    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    arr = np.array(image, dtype=np.float32)
    if isinstance(kernel_or_type, str):
        if kernel_or_type == 'invert':
            arr = 255 - arr
            filtered_img = Image.fromarray(arr.astype(np.uint8))
        elif kernel_or_type == 'grayscale':
            gray = np.dot(arr[...,:3], [0.299, 0.587, 0.114])
            filtered_img = Image.fromarray(gray.astype(np.uint8)).convert('L')
        else:
            raise ValueError('Unknown filter type')
    else:
        # Assume kernel
        pad = 1
        arr_padded = np.pad(arr, ((pad, pad), (pad, pad), (0, 0)), mode='edge')
        filtered = np.zeros_like(arr)
        for y in range(arr.shape[0]):
            for x in range(arr.shape[1]):
                for c in range(3):
                    region = arr_padded[y:y+3, x:x+3, c]
                    filtered[y, x, c] = np.clip(np.sum(region * kernel_or_type), 0, 255)
        filtered_img = Image.fromarray(filtered.astype(np.uint8))
    buf = io.BytesIO()
    filtered_img.save(buf, format='PNG')
    return buf.getvalue()

# Predefined kernels
KERNELS = {
    "sharpen": [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
    "blur": [[1/9]*3, [1/9]*3, [1/9]*3],
    "smoothen": [[1/16, 2/16, 1/16], [2/16, 4/16, 2/16], [1/16, 2/16, 1/16]],
    "edge": [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]],
    "invert": "invert",
    "grayscale": "grayscale"
}
