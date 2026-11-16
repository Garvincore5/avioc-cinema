from PIL import Image, ImageDraw

image = Image.new("RGBA", (256, 256), (11, 18, 32, 255))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((38, 61, 219, 216), radius=24, fill=(30, 41, 59), outline=(96, 165, 250), width=8)
draw.line((57, 109, 199, 109), fill=(148, 163, 184), width=8)
draw.line((64, 139, 111, 139), fill=(248, 250, 252), width=9)
draw.line((64, 165, 129, 165), fill=(248, 250, 252), width=9)
draw.line((64, 191, 102, 191), fill=(248, 250, 252), width=9)
draw.line((157, 150, 174, 167, 202, 132), fill=(74, 222, 128), width=11, joint="curve")
image.save("assets/icons/core-sorter.ico", sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
