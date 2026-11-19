"""Make a second, differently-captured photo of the clean DEMO sheet (another observer's phone):
slightly rotated, a little blurred, warmer and darker. Same figures, different file, so it has its own fingerprint.
Run after generate_sample_sheets.py: python3 docs/generate_second_photo.py"""
import json, os
from PIL import Image, ImageEnhance, ImageFilter

D = os.path.join(os.path.dirname(__file__), "..", "public", "sample-result-sheets")
im = Image.open(os.path.join(D, "sheet-a-clean.png")).convert("RGB")
im = im.rotate(-2.2, resample=Image.BICUBIC, expand=True, fillcolor=(58, 52, 46))
im = im.filter(ImageFilter.GaussianBlur(0.9))
im = ImageEnhance.Brightness(im).enhance(0.92)
im = ImageEnhance.Color(im).enhance(0.9)
im.save(os.path.join(D, "sheet-a-second-photo.png"))

p = os.path.join(D, "ground-truth.json")
truth = json.load(open(p))
truth["sheet-a-second-photo"] = {"note": "Same figures as sheet A, photographed again by a second observer", "fields": truth["sheet-a-clean"]["fields"]}
json.dump(truth, open(p, "w"), indent=2)
print("wrote sheet-a-second-photo")
