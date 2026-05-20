#!/usr/bin/env python3
"""添加新事件到乐队时间线网站"""

import json
import os
import shutil
from pathlib import Path


def load_data():
    """加载 data.json"""
    with open("data.json", "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data):
    """保存 data.json，保持日期排序"""
    data["events"].sort(key=lambda e: e["date"], reverse=True)
    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n已保存到 data.json（共 {len(data['events'])} 个事件）")


def compress_image(src_path, dst_path, max_width=1920, quality=85):
    """压缩图片"""
    try:
        from PIL import Image

        img = Image.open(src_path)
        if img.width > max_width:
            ratio = max_width / img.width
            new_size = (max_width, int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        img.save(dst_path, quality=quality, optimize=True)
        return True
    except ImportError:
        print("未安装 Pillow，直接复制原图（安装命令：pip install Pillow）")
        shutil.copy2(src_path, dst_path)
        return False


def add_event():
    """交互式添加新事件"""
    print("=" * 40)
    print("  添加新事件到乐队时间线")
    print("=" * 40)

    data = load_data()

    # 事件信息
    title = input("\n事件名称：").strip()
    if not title:
        print("事件名称不能为空")
        return

    date = input("日期（格式 2024-05-20）：").strip()
    if not date:
        print("日期不能为空")
        return

    description = input("描述（可选，直接回车跳过）：").strip()

    # 照片
    photos = []
    photo_dir = input("照片文件夹路径（可选，直接回车跳过）：").strip()
    if photo_dir and os.path.isdir(photo_dir):
        # 创建事件文件夹
        event_folder = f"images/{date}-{title}"
        os.makedirs(event_folder, exist_ok=True)

        # 复制并压缩照片
        valid_ext = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
        photo_files = sorted(
            [f for f in Path(photo_dir).iterdir() if f.suffix.lower() in valid_ext]
        )

        for i, photo_file in enumerate(photo_files, 1):
            ext = photo_file.suffix.lower()
            dst_name = f"{i}{ext}"
            dst_path = os.path.join(event_folder, dst_name)

            if ext in {".jpg", ".jpeg"}:
                compress_image(str(photo_file), dst_path)
            else:
                shutil.copy2(str(photo_file), dst_path)

            photos.append(f"{event_folder}/{dst_name}")
            print(f"  已处理：{photo_file.name} -> {dst_name}")

    elif photo_dir:
        print(f"文件夹不存在：{photo_dir}")

    # 视频
    video = input("B站视频链接（可选，直接回车跳过）：").strip()
    if not video:
        video = None

    # 创建事件
    event = {
        "date": date,
        "title": title,
        "description": description if description else None,
        "photos": photos,
        "video": video,
    }

    data["events"].append(event)
    save_data(data)
    print(f"\n✓ 事件 '{title}' 已添加！")


if __name__ == "__main__":
    add_event()
