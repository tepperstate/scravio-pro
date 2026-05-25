import os

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    os.system("pip install Pillow")
    from PIL import Image, ImageDraw, ImageFont

def create_icon(size):
    # Create a new image with a gradient-like blue background
    img = Image.new('RGB', (size, size), color=(37, 99, 235)) # Tailwind blue-600
    
    # Draw text "SS" in the center
    d = ImageDraw.Draw(img)
    text = "SS"
    
    # Try to use a default font
    try:
        # Scale font size based on image size
        font_size = max(8, int(size * 0.5))
        font = ImageFont.truetype("arial.ttf", font_size)
    except IOError:
        font = ImageFont.load_default()
        
    # Get text bounding box to center it
    try:
        bbox = d.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        x = (size - text_w) / 2
        y = (size - text_h) / 2
        
        # Adjust Y offset for default font which might be slightly off
        if font.getname()[0] != 'Arial':
           y = y - 2
           
    except AttributeError: # older Pillow versions
        text_w, text_h = d.textsize(text, font=font)
        x = (size - text_w) / 2
        y = (size - text_h) / 2

    d.text((x, y), text, fill=(255, 255, 255), font=font)
    
    # Save the image
    output_path = f"c:/Users/Robocop/Downloads/Scravio-pro/chrome-extension/icons/icon{size}.png"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    print(f"Created {output_path}")

# Generate the three required sizes
create_icon(16)
create_icon(48)
create_icon(128)
