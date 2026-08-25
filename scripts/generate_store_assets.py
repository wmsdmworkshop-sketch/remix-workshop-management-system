import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def extract_logo(image_path):
    img = cv2.imread(image_path)
    # Background color is (247, 247, 247)
    bg = np.array([247.0, 247.0, 247.0])
    dist = np.linalg.norm(img.astype(float) - bg, axis=2)

    # Clean alpha mask with smooth transition
    alpha = np.clip((dist - 12.0) / 18.0, 0.0, 1.0)
    alpha[dist < 10.0] = 0.0
    alpha_blur = cv2.GaussianBlur(alpha, (3, 3), 0)

    # Tight crop bbox
    mask = alpha_blur > 0.1
    coords = np.argwhere(mask)
    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0)

    pad = 6
    y0 = max(0, y0 - pad)
    x0 = max(0, x0 - pad)
    y1 = min(img.shape[0], y1 + pad)
    x1 = min(img.shape[1], x1 + pad)

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)[y0:y1, x0:x1].astype(float)
    cropped_alpha = alpha_blur[y0:y1, x0:x1]

    # Defringe
    a_norm = cropped_alpha[:, :, np.newaxis]
    safe_a = np.maximum(a_norm, 0.05)
    foreground = np.clip((rgb - (1.0 - a_norm) * bg) / safe_a, 0.0, 255.0)

    rgba = np.dstack([foreground.astype(np.uint8), (cropped_alpha * 255).astype(np.uint8)])
    return Image.fromarray(rgba, 'RGBA')

def create_play_store_icon(logo_cropped, output_path, size=512):
    # Solid deep navy #1E1E2D
    bg_color = (30, 30, 45, 255)
    canvas = Image.new("RGBA", (size, size), bg_color)
    
    # Target height 350px (occupying ~68% of canvas, perfectly centered within safe zone)
    target_h = int(size * 0.68)
    lw, lh = logo_cropped.size
    scale = target_h / float(lh)
    new_w = int(lw * scale)
    new_h = int(lh * scale)
    
    resized_logo = logo_cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    pos_x = (size - new_w) // 2
    pos_y = (size - new_h) // 2
    
    canvas.paste(resized_logo, (pos_x, pos_y), resized_logo)
    
    # Must stay RGBA. Google Play's validator requires the 512x512 store icon to
    # be a 32-bit PNG with an alpha channel and rejects 24-bit RGB. The navy
    # background is fully opaque, so this is visually identical either way.
    final_icon = canvas.convert("RGBA")
    final_icon.save(output_path, "PNG", quality=100)
    print(f"Play Store Icon saved: {output_path} ({size}x{size})")

def create_feature_graphic(logo_cropped, output_path, width=1024, height=500):
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(canvas)
    
    # 1. Subtle horizontal gradient: #0B1220 (11, 18, 32) -> #1E1E2D (30, 30, 45)
    c1 = (11, 18, 32)
    c2 = (30, 30, 45)
    for x in range(width):
        t = x / float(width)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        draw.line([(x, 0), (x, height)], fill=(r, g, b, 255))
        
    # 2. Faint dark technical grid (~5% opacity)
    grid_color = (255, 255, 255, 12)
    grid_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid_img)
    grid_size = 40
    for x in range(0, width, grid_size):
        grid_draw.line([(x, 0), (x, height)], fill=grid_color, width=1)
    for y in range(0, height, grid_size):
        grid_draw.line([(0, y), (width, y)], fill=grid_color, width=1)
    canvas = Image.alpha_composite(canvas, grid_img)
    
    # 3. Soft warm orange glow behind the logo
    logo_center_x = 240
    logo_center_y = 250
    
    glow_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_radius = 180
    
    for r in range(glow_radius, 0, -2):
        alpha = int(40 * (1.0 - (r / float(glow_radius))**1.4))
        glow_draw.ellipse(
            [(logo_center_x - r, logo_center_y - r), (logo_center_x + r, logo_center_y + r)],
            fill=(255, 85, 0, alpha)
        )
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(16))
    canvas = Image.alpha_composite(canvas, glow_img)
    
    # 4. Paste exact official logo (preserving 100% dimensions and features)
    target_logo_h = 320
    lw, lh = logo_cropped.size
    scale = target_logo_h / float(lh)
    new_w = int(lw * scale)
    new_h = int(lh * scale)
    resized_logo = logo_cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    logo_x = logo_center_x - new_w // 2
    logo_y = logo_center_y - new_h // 2
    canvas.paste(resized_logo, (logo_x, logo_y), resized_logo)
    
    # 5. Right two-thirds Typography
    text_x = 470
    
    # Fonts
    font_dwip_path = "C:/Windows/Fonts/segoeuib.ttf"
    if not os.path.exists(font_dwip_path):
        font_dwip_path = "C:/Windows/Fonts/arialbd.ttf"
        
    font_sub_path = "C:/Windows/Fonts/segoeui.ttf"
    if not os.path.exists(font_sub_path):
        font_sub_path = "C:/Windows/Fonts/arial.ttf"
        
    font_dwip = ImageFont.truetype(font_dwip_path, 110)
    font_sub = ImageFont.truetype(font_dwip_path, 22)
    
    text_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(text_img)
    
    # DWIP title in heavy extrabold white
    title_y = 145
    tdraw.text((text_x, title_y), "DWIP", font=font_dwip, fill=(255, 255, 255, 255))
    
    bbox_dwip = tdraw.textbbox((text_x, title_y), "DWIP", font=font_dwip)
    
    # Cyan accent rule: #06B6D4 (6, 182, 212)
    line_y = bbox_dwip[3] + 14
    line_w = 440
    tdraw.rectangle([(text_x, line_y), (text_x + line_w, line_y + 3)], fill=(6, 182, 212, 255))
    
    # Subtitle: WORKSHOP MANAGEMENT in uppercase letter-spaced light grey (#94A3B8)
    sub_text = "W O R K S H O P   M A N A G E M E N T"
    sub_y = line_y + 16
    tdraw.text((text_x, sub_y), sub_text, font=font_sub, fill=(148, 163, 184, 255))
    
    canvas = Image.alpha_composite(canvas, text_img)
    
    final_banner = canvas.convert("RGB")
    final_banner.save(output_path, "PNG", quality=100)
    print(f"Feature Graphic saved: {output_path} ({width}x{height})")

if __name__ == "__main__":
    logo_src = r"C:\Users\arhaa\.gemini\antigravity-ide\brain\79c83417-6d16-452e-9168-ec8794fe41c9\.user_uploaded\media_1787655676818.jpg"
    out_dir = r"C:\Users\arhaa\.gemini\antigravity-ide\brain\79c83417-6d16-452e-9168-ec8794fe41c9"
    # NOT public/ — Vite copies public/ verbatim into dist/, which would bundle
    # these into the AAB (dead weight in every install) and publish them at
    # devanand.aivaahan.com. Store listing art is a build input, not a shipped
    # asset, so it lives outside the web root.
    pub_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "store-assets"
    )
    os.makedirs(pub_dir, exist_ok=True)
    
    print("Processing exact official logo with pixel-perfect subpixel alpha...")
    logo_cropped = extract_logo(logo_src)
    
    # 1. Official standalone transparent PNG
    logo_cropped.save(os.path.join(out_dir, "official_logo_transparent.png"), "PNG")
    logo_cropped.save(os.path.join(pub_dir, "official_logo_transparent.png"), "PNG")
    
    # 2. 512x512 Google Play Store App Icon
    icon_out1 = os.path.join(out_dir, "official_play_store_icon_512.png")
    icon_out2 = os.path.join(pub_dir, "play_store_icon_512.png")
    create_play_store_icon(logo_cropped, icon_out1, 512)
    create_play_store_icon(logo_cropped, icon_out2, 512)
    
    # 3. 1024x500 Google Play Store Feature Graphic Banner
    feat_out1 = os.path.join(out_dir, "official_play_store_feature_graphic_1024x500.png")
    feat_out2 = os.path.join(pub_dir, "play_store_feature_graphic_1024x500.png")
    create_feature_graphic(logo_cropped, feat_out1, 1024, 500)
    create_feature_graphic(logo_cropped, feat_out2, 1024, 500)
    
    # Plain ASCII: the Windows console defaults to cp1252 and raises
    # UnicodeEncodeError on emoji, which crashed the script after it had already
    # written every asset -- making a successful run look like a failure.
    print("\nDone. Generated all Google Play Store assets from the original logo.")
