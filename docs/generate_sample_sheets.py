"""Generate the synthetic DEMO result sheets. Run: python3 docs/generate_sample_sheets.py
All names, units and figures are invented. Every sheet is stamped DEMO."""
import json, os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sample-result-sheets")
os.makedirs(OUT, exist_ok=True)
FONT = "/System/Library/Fonts/Supplemental/Courier New Bold.ttf"
F = lambda n: ImageFont.truetype(FONT, n)

BASE = {"registered": 520, "accredited": 310, "parties": {"Party A": 112, "Party B": 98, "Party C": 31},
        "valid": 241, "rejected": 9, "cast": 250}
SHEETS = {
    "sheet-a-clean": (BASE, "Clean: all figures consistent"),
    "sheet-b-altered-figure": ({**BASE, "parties": {**BASE["parties"], "Party B": 89}}, "One figure altered: Party B 98 -> 89"),
    "sheet-c-bad-arithmetic": ({**BASE, "cast": 260}, "Bad arithmetic: valid + rejected does not equal cast"),
}

def draw(name, f, note):
    W, H = 900, 1180
    im = Image.new("RGB", (W, H), "#fbfaf6")
    d = ImageDraw.Draw(im)
    d.rectangle([20, 20, W - 20, H - 20], outline="#222", width=3)
    d.text((W // 2, 70), "RESULT OF POLL", font=F(38), fill="#111", anchor="mm")
    d.text((W // 2, 112), "SYNTHETIC SAMPLE - NOT A REAL ELECTION DOCUMENT", font=F(20), fill="#b42318", anchor="mm")
    d.text((50, 170), "State: LAGOS (DEMO)      LGA: IKEJA (DEMO)", font=F(24), fill="#111")
    d.text((50, 210), "Ward: 04                 Unit: 012 - Ikeja Primary School", font=F(24), fill="#111")
    y = 290
    def row(label, val):
        nonlocal y
        d.rectangle([50, y, W - 50, y + 56], outline="#222", width=2)
        d.text((70, y + 28), label, font=F(26), fill="#111", anchor="lm")
        d.text((W - 80, y + 28), str(val), font=F(32), fill="#0a2a6a", anchor="rm")
        y += 56
    row("Registered voters", f["registered"])
    row("Accredited voters", f["accredited"])
    y += 20
    for p, v in f["parties"].items():
        row(p, v)
    y += 20
    row("Total valid votes", f["valid"])
    row("Rejected votes", f["rejected"])
    row("Total votes cast", f["cast"])
    d.text((50, y + 60), "Presiding officer: ______________ (demo)", font=F(22), fill="#555")
    d.text((50, y + 100), "Agents' signatures: ______________ (demo)", font=F(22), fill="#555")
    # DEMO watermark
    wm = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wm)
    wd.text((W // 2, H // 2 + 120), "DEMO", font=F(220), fill=(180, 35, 24, 38), anchor="mm")
    wm = wm.rotate(25, resample=Image.BICUBIC, center=(W // 2, H // 2))
    im = Image.alpha_composite(im.convert("RGBA"), wm).convert("RGB")
    im.save(os.path.join(OUT, name + ".png"))

meta = {}
for name, (f, note) in SHEETS.items():
    draw(name, f, note)
    meta[name] = {"note": note, "fields": f}
with open(os.path.join(OUT, "ground-truth.json"), "w") as fh:
    json.dump(meta, fh, indent=2)
print("wrote", list(SHEETS))
