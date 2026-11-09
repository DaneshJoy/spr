#!/usr/bin/env python3
"""Archive a static site with its files at the ZIP root."""
import sys
import zipfile
from pathlib import Path

source = Path(sys.argv[1])
archive = Path(sys.argv[2])

with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as output:
    for path in source.rglob("*"):
        if path.is_file():
            output.write(path, path.relative_to(source))
