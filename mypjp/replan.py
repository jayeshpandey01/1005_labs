#!/usr/bin/env python3
"""Wrapper for PJP dynamic replan CLI module."""

import sys
from pathlib import Path

# Add skills scripts to path
SCRIPT_PATH = Path(__file__).resolve().parents[1] / ".agents" / "skills" / "pjp-ai-developer" / "scripts" / "dynamic_replan.py"

if __name__ == "__main__":
    import subprocess
    cmd = [sys.executable, str(SCRIPT_PATH)] + sys.argv[1:]
    res = subprocess.run(cmd)
    sys.exit(res.returncode)
