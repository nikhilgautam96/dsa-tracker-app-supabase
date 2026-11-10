"""Build the tracker data and split it into
   - public/problems.json         : the shared problem list (no personal data), served to every user
   - data-pipeline/out/my-progress.json : the owner's auto-detected solved keys (LeetCode + Notion) and known
     solution links (LeetCode submission URLs from Notion), imported once in the app
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
# Solution links already recorded in Notion (LeetCode submission URLs). If a problem has several, keep the last one.
import re
known = {i['pk'] for i in d['items']}
links = {}
for line in open(os.path.join(HERE, 'raw', 'notion_blind75.tsv'), encoding='utf-8'):
    for m in re.finditer(r'https?://leetcode\.com/problems/([a-z0-9-]+)/submissions/(\d+)/?', line):
        pk = 'lc:' + m.group(1)
        if pk in known and pk in set(solved):
            links[pk] = f'https://leetcode.com/problems/{m.group(1)}/submissions/{m.group(2)}/'
json.dump({'version': 2, 'solved': solved, 'links': dict(sorted(links.items()))},
          open(os.path.join(HERE, 'out', 'my-progress.json'), 'w'), indent=1)
print(f"problems.json: {len(d['items'])} items | my-progress.json: {len(solved)} solved keys, {len(links)} with solution links")
