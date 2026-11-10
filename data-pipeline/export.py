"""Build the tracker data and split it into
   - public/problems.json         : the shared problem list (no personal data), served to every user
   - data-pipeline/out/my-progress.json : the owner's auto-detected solved keys (LeetCode + Notion), imported once in the app
Usage:  python3 data-pipeline/export.py
"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
ROADMAP = os.path.join(os.path.dirname(APP), 'ROADMAP.md')
full = os.path.join(HERE, 'out', 'full.json')
subprocess.run([sys.executable, '-I', os.path.join(HERE, 'build.py'), os.path.join(HERE, 'raw'), ROADMAP, full], check=True)
d = json.load(open(full))
solved = sorted({(i.get('pk') or i['key']) for i in d['items'] if i['solved']})
for i in d['items']:
    i.pop('solved', None)
    i['pk'] = i.get('pk') or i['key']
json.dump(d, open(os.path.join(APP, 'public', 'problems.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump({'version': 1, 'solved': solved}, open(os.path.join(HERE, 'out', 'my-progress.json'), 'w'), indent=1)
print(f"problems.json: {len(d['items'])} items | my-progress.json: {len(solved)} solved keys")
