from PIL import Image, ImageDraw, ImageFont
import os

W, H = 512, 512
primary = (11, 58, 110)
accent = (232, 163, 23)
white = (255, 255, 255)

img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
cx, cy = W // 2, H // 2 + 10
shield = [
    (cx, 40),
    (W - 70, 120),
    (W - 90, 320),
    (cx, H - 40),
    (90, 320),
    (70, 120),
]
d.polygon(shield, fill=primary)
r = 78
d.ellipse((cx - r, cy - r - 20, cx + r, cy + r - 20), fill=accent)
try:
    font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 96)
except Exception:
    font = ImageFont.load_default()
text = 'AN'
bbox = d.textbbox((0, 0), text, font=font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
d.text((cx - tw / 2, cy - th / 2 - 28), text, fill=white, font=font)
out1 = r'C:\Users\Thiruppathi\Desktop\School\schoolos\database\prisma\seed\assets\arulneri-logo.png'
out2 = r'C:\Users\Thiruppathi\Desktop\School\schoolos\apps\mobile\assets\branding\arulneri-logo.png'
img.save(out1)
img.save(out2)
print('saved', out1, os.path.getsize(out1))
print('saved', out2, os.path.getsize(out2))
