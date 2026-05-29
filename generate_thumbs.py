#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为 images/ 文件夹中的照片生成缩略图

缩略图放在 images/_thumbs/ 下，保持相同的子文件夹结构
"""

import glob
import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("需要安装 Pillow: pip install Pillow")
    exit(1)


THUMB_SIZE = 300  # 缩略图最大宽/高
THUMB_DIR = "images/_thumbs"


def generate_thumbnails():
    image_dir = "images"
    count = 0

    for ext in ("*.jpg", "*.jpeg", "*.png", "*.gif", "*.webp"):
        for path in glob.glob(os.path.join(image_dir, "**", ext), recursive=True):
            # 跳过缩略图目录本身
            if "_thumbs" in path:
                continue

            # 计算缩略图路径
            rel_path = os.path.relpath(path, image_dir)
            thumb_path = os.path.join(THUMB_DIR, rel_path)

            # 如果缩略图已存在且比原图新，跳过
            if os.path.exists(thumb_path):
                if os.path.getmtime(thumb_path) >= os.path.getmtime(path):
                    continue

            # 创建目录
            os.makedirs(os.path.dirname(thumb_path), exist_ok=True)

            # 生成缩略图
            try:
                img = Image.open(path)
                img.thumbnail((THUMB_SIZE, THUMB_SIZE), Image.LANCZOS)
                img.save(thumb_path, "JPEG", quality=75, optimize=True)
                count += 1
                print(f"  {rel_path}")
            except Exception as e:
                print(f"  [跳过] {rel_path}: {e}")

    print(f"\n生成 {count} 个缩略图")


if __name__ == "__main__":
    print("=" * 40)
    print("  生成缩略图")
    print("=" * 40 + "\n")
    generate_thumbnails()
