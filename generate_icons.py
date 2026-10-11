import os
from PIL import Image, ImageDraw

os.makedirs('public', exist_ok=True)
os.makedirs('public/icons', exist_ok=True)

def create_app_icon(size, filename):
    # Create high-res image with smooth blue gradient and water drop badge
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Outer rounded background (Deep Ocean Blue)
    padding = int(size * 0.04)
    radius = int(size * 0.22)
    # Draw rounded rectangle for app icon
    draw.rounded_rectangle(
        [padding, padding, size - padding, size - padding],
        radius=radius,
        fill=(2, 132, 199, 255) # Ocean Blue #0284c7
    )
    
    # Inner subtle glow circle
    cx, cy = size // 2, int(size * 0.52)
    r = int(size * 0.34)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(14, 165, 233, 255))
    
    # Water drop shape in white
    drop_width = int(size * 0.44)
    drop_height = int(size * 0.54)
    top_y = cy - int(drop_height * 0.55)
    bottom_y = cy + int(drop_height * 0.45)
    
    # Polygon / curves approximating a clean modern droplet
    # Top tip: (cx, top_y)
    # Bottom circle: center at (cx, cy + int(drop_height * 0.1)), radius int(drop_width * 0.5)
    circle_r = int(drop_width * 0.46)
    circle_cy = bottom_y - circle_r
    
    # Draw bottom circular base
    draw.ellipse([cx - circle_r, circle_cy - circle_r, cx + circle_r, circle_cy + circle_r], fill=(255, 255, 255, 255))
    
    # Draw upper triangle connected smoothly
    points = [
        (cx, top_y),
        (cx - circle_r + int(size * 0.03), circle_cy),
        (cx + circle_r - int(size * 0.03), circle_cy)
    ]
    draw.polygon(points, fill=(255, 255, 255, 255))
    
    # Inner droplet shine / accent
    shine_r = int(circle_r * 0.35)
    draw.ellipse([cx - int(circle_r * 0.5), circle_cy - int(circle_r * 0.4), cx - int(circle_r * 0.5) + shine_r, circle_cy - int(circle_r * 0.4) + shine_r], fill=(224, 242, 254, 255))
    
    img.save(filename, 'PNG')
    print(f"Generated {filename} ({size}x{size})")

create_app_icon(192, 'public/icons/icon-192.png')
create_app_icon(512, 'public/icons/icon-512.png')
create_app_icon(180, 'public/icons/apple-touch-icon.png')
create_app_icon(64, 'public/icons/favicon-64.png')
print("All icons generated successfully.")
