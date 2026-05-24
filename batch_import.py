#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量导入照片到乐队时间线网站

用法:
  python batch_import.py "D:\乐队素材"

素材文件夹结构:
  D:\乐队素材\
  ├── 2024-05-20 年会演出\
  │   ├── photo1.jpg
  │   └── photo2.jpg
  ├── 2023-12-25 圣诞排练\
  │   └── photo1.jpg
  └── ...

文件夹名格式: "YYYY-MM-DD 事件名称"
支持的照片格式: jpg, jpeg, png, gif, webp
每个事件文件夹里可以放一个 video.txt，内容为B站链接
"""

import json
import os
import re
import shutil
import sys
from pathlib import Path


def load_data():
    with open("data.json", "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data):
    data["events"].sort(key=lambda e: e["date"], reverse=True)
    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def compress_image(src_path, dst_path, max_width=1920, quality=85):
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
        shutil.copy2(src_path, dst_path)
        return False


def parse_folder_name(name):
    """从文件夹名解析日期和事件名称，格式: YYYY-MM-DD 事件名称"""
    match = re.match(r"(\d{4}-\d{2}-\d{2})\s+(.+)", name)
    if match:
        return match.group(1), match.group(2)
    return None, name


def process_event_folder(folder_path, existing_dates):
    """处理单个事件文件夹，返回事件数据或 None"""
    folder_name = os.path.basename(folder_path)
    date, title = parse_folder_name(folder_name)

    if not date:
        print(f"  [跳过] {folder_name} - 文件夹名格式不对，需要: YYYY-MM-DD 事件名称")
        return None

    event_key = f"{date}-{title}"
    if event_key in existing_dates:
        print(f"  [跳过] {title} ({date}) - 已存在")
        return None

    # 找照片
    valid_ext = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    all_files = sorted(Path(folder_path).iterdir())
    photo_files = [f for f in all_files if f.suffix.lower() in valid_ext]

    if not photo_files:
        print(f"  [跳过] {title} - 没有找到照片")
        return None

    # 复制照片
    event_folder_name = f"{date}-{title}"
    dst_folder = os.path.join("images", event_folder_name)
    os.makedirs(dst_folder, exist_ok=True)

    photos = []
    for i, photo_file in enumerate(photo_files, 1):
        ext = photo_file.suffix.lower()
        dst_name = f"{i}{ext}"
        dst_path = os.path.join(dst_folder, dst_name)

        if ext in {".jpg", ".jpeg"}:
            compress_image(str(photo_file), dst_path)
        else:
            shutil.copy2(str(photo_file), dst_path)

        photos.append(f"{dst_folder}/{dst_name}")

    # 检查 video.txt
    video = None
    video_file = os.path.join(folder_path, "video.txt")
    if os.path.exists(video_file):
        with open(video_file, "r", encoding="utf-8") as f:
            link = f.read().strip()
            if link:
                video = link

    return {
        "date": date,
        "title": title,
        "description": None,
        "photos": photos,
        "video": video,
    }


def main():
    if len(sys.argv) < 2:
        print("用法: python batch_import.py <素材文件夹路径>")
        print('例如: python batch_import.py "D:\\乐队素材"')
        return

    source_dir = sys.argv[1]
    if not os.path.isdir(source_dir):
        print(f"文件夹不存在: {source_dir}")
        return

    data = load_data()

    # 记录已存在的事件，避免重复导入
    existing_dates = set()
    for event in data["events"]:
        existing_dates.add(f"{event['date']}-{event['title']}")

    # 扫描所有子文件夹
    subfolders = sorted(
        [f for f in Path(source_dir).iterdir() if f.is_dir()],
        key=lambda x: x.name,
    )

    if not subfolders:
        print("素材文件夹里没有子文件夹")
        return

    print("=" * 50)
    print("  批量导入乐队时间线")
    print("=" * 50)
    print(f"\n素材路径: {source_dir}")
    print(f"找到 {len(subfolders)} 个事件文件夹")
    print(f"已有 {len(data['events'])} 个事件\n")

    imported = 0
    skipped = 0

    for folder in subfolders:
        event = process_event_folder(str(folder), existing_dates)
        if event:
            data["events"].append(event)
            existing_dates.add(f"{event['date']}-{event['title']}")
            imported += 1
            print(f"  [导入] {event['title']} ({event['date']}) - {len(event['photos'])} 张照片")
        else:
            skipped += 1

    if imported > 0:
        save_data(data)
        print(f"\n完成！导入 {imported} 个事件，跳过 {skipped} 个")
        print(f"当前共 {len(data['events'])} 个事件")
    else:
        print("\n没有新事件需要导入")


if __name__ == "__main__":
    main()
