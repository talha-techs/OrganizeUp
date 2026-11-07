import subprocess
import os
from PIL import Image

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
if not os.path.exists(chrome_path):
    chrome_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

svg_path = os.path.abspath('client/public/organizeup-favicon.svg')
html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{ background: transparent; overflow: hidden; width: 512px; height: 512px; }}
  img {{ width: 512px; height: 512px; display: block; }}
</style>
</head>
<body>
  <img src="{svg_path}" />
</body>
</html>"""

with open('temp_render.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

html_abs = os.path.abspath('temp_render.html')
out_512 = os.path.abspath('client/public/pwa-512x512.png')

cmd = [
    chrome_path,
    '--headless=new',
    '--disable-gpu',
    '--default-background-color=00000000',
    '--window-size=512,512',
    f'--screenshot={out_512}',
    html_abs
]

print('Running browser screenshot to generate 512x512 PNG...')
subprocess.run(cmd, check=True)

if os.path.exists(out_512):
    print('Rendered 512x512 PNG, size:', os.path.getsize(out_512))
    base = Image.open(out_512).convert('RGBA')

    # 1. pwa-192x192.png (High contrast for OS notifications & PWA)
    im192 = base.resize((192, 192), Image.Resampling.LANCZOS)
    im192.save('client/public/pwa-192x192.png', 'PNG')
    print('✓ Saved pwa-192x192.png')

    # 2. maskable-icon-512x512.png (Safe zone compliant)
    maskable = Image.new('RGBA', (512, 512), (9, 9, 11, 255))
    scaled_logo = base.resize((410, 410), Image.Resampling.LANCZOS)
    maskable.paste(scaled_logo, (51, 51), scaled_logo)
    maskable.save('client/public/maskable-icon-512x512.png', 'PNG')
    print('✓ Saved maskable-icon-512x512.png')

    # 3. favicon.png (64x64)
    im64 = base.resize((64, 64), Image.Resampling.LANCZOS)
    im64.save('client/public/favicon.png', 'PNG')
    print('✓ Saved favicon.png')

    # 4. favicon-32x32.png
    im32 = base.resize((32, 32), Image.Resampling.LANCZOS)
    im32.save('client/public/favicon-32x32.png', 'PNG')
    print('✓ Saved favicon-32x32.png')

    # 5. favicon-16x16.png
    im16 = base.resize((16, 16), Image.Resampling.LANCZOS)
    im16.save('client/public/favicon-16x16.png', 'PNG')
    print('✓ Saved favicon-16x16.png')

    # 6. organizeup-logo.png
    base.save('client/public/organizeup-logo.png', 'PNG')
    print('✓ Saved organizeup-logo.png')

    # 7. favicon.ico
    base.save('client/public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print('✓ Saved favicon.ico')

    # Render monochrome badge (96x96)
    badge_svg = os.path.abspath('client/public/notification-badge.svg')
    badge_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; }}
  html, body {{ background: transparent; overflow: hidden; width: 96px; height: 96px; }}
  img {{ width: 96px; height: 96px; display: block; }}
</style>
</head>
<body>
  <img src="{badge_svg}" />
</body>
</html>"""
    with open('temp_badge.html', 'w', encoding='utf-8') as f:
        f.write(badge_html)
    
    badge_out = os.path.abspath('client/public/notification-badge.png')
    subprocess.run([
        chrome_path,
        '--headless=new',
        '--disable-gpu',
        '--default-background-color=00000000',
        '--window-size=96,96',
        f'--screenshot={badge_out}',
        os.path.abspath('temp_badge.html')
    ], check=True)
    print('✓ Saved notification-badge.png')

    # Cleanup temp files
    if os.path.exists('temp_render.html'):
        os.remove('temp_render.html')
    if os.path.exists('temp_badge.html'):
        os.remove('temp_badge.html')

print('All notification favicons and icons regenerated successfully!')
