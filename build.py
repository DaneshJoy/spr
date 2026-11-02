#!/usr/bin/env python3
"""Build standalone HTML pages from the reusable layout and lesson fragments."""
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist"
PLACEHOLDERS = re.compile(r"\{\{[A-Z_]+\}\}")


def fail(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def load_lessons() -> list[dict]:
    path = ROOT / "lessons.json"
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"lessons.json is not readable JSON: {exc}")


lessons = load_lessons()
layout_path = ROOT / "templates" / "layout.html"
try:
    layout = layout_path.read_text(encoding="utf-8")
except OSError as exc:
    fail(f"layout template is not readable: {exc}")

for field in ("file", "title", "description", "content", "script"):
    if any(not lesson.get(field) for lesson in lessons):
        fail(f"every lessons.json entry needs a non-empty '{field}'")

files = [lesson["file"] for lesson in lessons]
if len(set(files)) != len(files):
    fail("lessons.json has duplicate 'file' entries")

for lesson in lessons:
    for field in ("content", "script"):
        if not (ROOT / lesson[field]).is_file():
            fail(f"lesson {lesson['file']} references missing {field} file {lesson[field]}")

if DIST.exists():
    shutil.rmtree(DIST)
shutil.copytree(ROOT / "assets", DIST / "assets")
shutil.copy2(ROOT / "index.html", DIST / "index.html")
shutil.copy2(ROOT / "lessons.json", DIST / "lessons.json")
shutil.copy2(ROOT / "course.json", DIST / "course.json")

for index, lesson in enumerate(lessons):
    content = (ROOT / lesson["content"]).read_text(encoding="utf-8")
    previous = f'<a class="btn" href="{lessons[index - 1]["file"]}">← درس قبلی</a>' if index else "<span></span>"
    following = f'<a class="btn" href="{lessons[index + 1]["file"]}">درس بعدی →</a>' if index + 1 < len(lessons) else "<span></span>"
    page = (
        layout.replace("{{TITLE}}", lesson["title"])
        .replace("{{DESCRIPTION}}", lesson["description"])
        .replace("{{CONTENT}}", content)
        .replace("{{PREVIOUS_LINK}}", previous)
        .replace("{{NEXT_LINK}}", following)
        .replace("{{LESSON_SCRIPT}}", lesson["script"])
    )
    if PLACEHOLDERS.search(page):
        fail(f"lesson {lesson['file']} left unreplaced placeholders in the final page")
    (DIST / lesson["file"]).write_text(page, encoding="utf-8")

print(f"Built {len(lessons)} lessons into {DIST}")
