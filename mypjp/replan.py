#!/usr/bin/env python3
"""Wrapper module for PJP dynamic replan CLI execution.

Invokes dynamic_replan directly in-process for sub-50ms execution.
"""

import argparse
import sys
from pathlib import Path

# Add script directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SKILL_SCRIPTS = PROJECT_ROOT / ".agents" / "skills" / "pjp-ai-developer" / "scripts"
if str(SKILL_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SKILL_SCRIPTS))

from dynamic_replan import replan

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PJP Re-plan CLI")
    parser.add_argument("--state", required=True, help="Path to STATE.json")
    parser.add_argument("--plan", required=True, help="Path to CURRENT_PLAN.csv")
    parser.add_argument("--out", required=True, help="Path to NEXT_PLAN.csv")
    args = parser.parse_args()
    replan(args.state, args.plan, args.out)
