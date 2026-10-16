"""Smallest valid re-plan command: keeps the current plan unchanged.

python simulate.py ... --replan-cmd "python example_replan_passthrough.py"
"""
import argparse, shutil

p = argparse.ArgumentParser()
p.add_argument('--state', required=True)
p.add_argument('--plan', required=True)
p.add_argument('--out', required=True)
a = p.parse_args()
shutil.copyfile(a.plan, a.out)
