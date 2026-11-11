import json, re, sys, os, urllib.parse
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pep_map import MANUAL, PLAYLIST_CATEGORY, PLAYLIST_URL

D = sys.argv[1]            # data dir
ROADMAP = sys.argv[2]      # ROADMAP.md
OUT = sys.argv[3]          # output json

def norm(s): return re.sub(r'[^a-z0-9]', '', s.lower())

# ---------------- LeetCode index ----------------
lc = {}          # slug -> dict
lc_by_id = {}
lc_by_title = {}
for line in open(f'{D}/lc_all.tsv', encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    if len(p) < 6: continue
    qid, slug, title, d, paid, ac = p
    r = dict(id=int(qid), slug=slug, title=title, d=int(d), paid=paid == '1', ac=ac == '1')
    lc[slug] = r; lc_by_id[qid] = r; lc_by_title[norm(title)] = r
tags = {}
for line in open(f'{D}/lc_tags.tsv', encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    tags[p[0]] = p[1].split(',') if len(p) > 1 and p[1] else []

dump = open(f'{D}/lc_dump.tsv', encoding='utf-8').read().splitlines()
G169 = [lc_by_id[i]['slug'] for i in dump[0].split('\t')[1].split(',')]
DES = [lc_by_id[i]['slug'] for i in dump[1].split('\t')[1].split(',')]
B75 = open(f'{D}/blind75.txt').read().split()
G75 = open(f'{D}/grind75.txt').read().split()

# ---------------- Codeforces index ----------------
cf = json.load(open(f'{D}/cf.json'))['result']['problems']
cf_by_code = {f"{p.get('contestId')}{p['index']}": p for p in cf}
cf_by_name = {}
for p in cf: cf_by_name.setdefault(norm(p['name']), []).append(p)

# ---------------- categorisation ----------------
CATS = ['Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack & Monotonic', 'Binary Search',
        'Linked List', 'Trees', 'Tries', 'Heap / Priority Queue', 'Intervals', 'Backtracking', 'Graphs',
        'Advanced Graphs', 'Dynamic Programming', 'Greedy', 'Bit Manipulation', 'Math & Number Theory',
        'Matrix', 'Strings & Text Processing', 'Design', 'Range Queries & Segment Tree', 'DSU & MST',
        'Binary Lifting & Euler Tour', 'Geometry', 'Game Theory', 'Constructive', 'Interactive', 'Concurrency',
        'Java 8 Streams']

LC_OVERRIDE = {
    # intervals
    **{s: 'Intervals' for s in ['merge-intervals', 'insert-interval', 'non-overlapping-intervals', 'meeting-rooms',
                                'meeting-rooms-ii', 'employee-free-time', 'data-stream-as-disjoint-intervals',
                                'minimum-number-of-arrows-to-burst-balloons']},
    'two-sum': 'Arrays & Hashing', 'contains-duplicate': 'Arrays & Hashing', 'valid-anagram': 'Arrays & Hashing',
    'group-anagrams': 'Arrays & Hashing', 'top-k-frequent-elements': 'Heap / Priority Queue',
    'product-of-array-except-self': 'Arrays & Hashing', 'longest-consecutive-sequence': 'Arrays & Hashing',
    'encode-and-decode-strings': 'Strings & Text Processing', 'majority-element': 'Arrays & Hashing',
    'ransom-note': 'Arrays & Hashing', 'longest-palindrome': 'Strings & Text Processing',
    '3sum': 'Two Pointers', '3sum-closest': 'Two Pointers', 'container-with-most-water': 'Two Pointers',
    'trapping-rain-water': 'Two Pointers', 'valid-palindrome': 'Two Pointers', 'sort-colors': 'Two Pointers',
    'move-zeroes': 'Two Pointers', 'squares-of-a-sorted-array': 'Two Pointers', 'backspace-string-compare': 'Two Pointers',
    'next-permutation': 'Arrays & Hashing', 'rotate-array': 'Arrays & Hashing',
    'best-time-to-buy-and-sell-stock': 'Sliding Window', 'longest-substring-without-repeating-characters': 'Sliding Window',
    'longest-repeating-character-replacement': 'Sliding Window', 'minimum-window-substring': 'Sliding Window',
    'find-all-anagrams-in-a-string': 'Sliding Window', 'sliding-window-maximum': 'Sliding Window',
    'maximum-subarray': 'Dynamic Programming', 'maximum-product-subarray': 'Dynamic Programming',
    'merge-k-sorted-lists': 'Heap / Priority Queue', 'find-median-from-data-stream': 'Heap / Priority Queue',
    'kth-largest-element-in-an-array': 'Heap / Priority Queue', 'k-closest-points-to-origin': 'Heap / Priority Queue',
    'task-scheduler': 'Heap / Priority Queue', 'top-k-frequent-words': 'Heap / Priority Queue',
    'smallest-range-covering-elements-from-k-lists': 'Heap / Priority Queue',
    'word-search': 'Backtracking', 'word-search-ii': 'Tries', 'n-queens': 'Backtracking', 'sudoku-solver': 'Backtracking',
    'valid-sudoku': 'Matrix', 'set-matrix-zeroes': 'Matrix', 'spiral-matrix': 'Matrix', 'rotate-image': 'Matrix',
    'search-a-2d-matrix': 'Binary Search', 'game-of-life': 'Matrix',
    'number-of-islands': 'Graphs', 'rotting-oranges': 'Graphs', 'flood-fill': 'Graphs', '01-matrix': 'Graphs',
    'pacific-atlantic-water-flow': 'Graphs', 'longest-increasing-path-in-a-matrix': 'Dynamic Programming',
    'word-ladder': 'Graphs', 'alien-dictionary': 'Advanced Graphs', 'cheapest-flights-within-k-stops': 'Advanced Graphs',
    'accounts-merge': 'DSU & MST', 'graph-valid-tree': 'Graphs',
    'number-of-connected-components-in-an-undirected-graph': 'Graphs', 'minimum-height-trees': 'Graphs',
    'bus-routes': 'Graphs', 'minimum-knight-moves': 'Graphs', 'shortest-path-to-get-food': 'Graphs',
    'sum-of-two-integers': 'Bit Manipulation', 'number-of-1-bits': 'Bit Manipulation', 'counting-bits': 'Bit Manipulation',
    'missing-number': 'Bit Manipulation', 'reverse-bits': 'Bit Manipulation', 'single-number': 'Bit Manipulation',
    'add-binary': 'Bit Manipulation', 'first-missing-positive': 'Arrays & Hashing',
    'basic-calculator': 'Stack & Monotonic', 'basic-calculator-ii': 'Stack & Monotonic', 'decode-string': 'Stack & Monotonic',
    'largest-rectangle-in-histogram': 'Stack & Monotonic', 'longest-valid-parentheses': 'Stack & Monotonic',
    'maximum-frequency-stack': 'Design', 'min-stack': 'Stack & Monotonic', 'lru-cache': 'Design', 'lfu-cache': 'Design',
    'implement-queue-using-stacks': 'Stack & Monotonic', 'implement-stack-using-queues': 'Stack & Monotonic',
    'time-based-key-value-store': 'Binary Search', 'maximum-profit-in-job-scheduling': 'Dynamic Programming',
    'word-break': 'Dynamic Programming', 'partition-equal-subset-sum': 'Dynamic Programming', 'decode-ways': 'Dynamic Programming',
    'gas-station': 'Greedy', 'jump-game': 'Greedy', 'largest-number': 'Greedy',
    'string-to-integer-atoi': 'Strings & Text Processing', 'longest-palindromic-substring': 'Dynamic Programming',
    'palindromic-substrings': 'Dynamic Programming', 'longest-common-prefix': 'Strings & Text Processing',
    'roman-to-integer': 'Math & Number Theory', 'palindrome-number': 'Math & Number Theory', 'reverse-integer': 'Math & Number Theory',
    'powx-n': 'Math & Number Theory', 'add-two-numbers': 'Linked List', 'implement-trie-prefix-tree': 'Tries',
    'design-add-and-search-words-data-structure': 'Tries', 'palindrome-pairs': 'Tries',
    'serialize-and-deserialize-binary-tree': 'Trees', 'serialize-and-deserialize-bst': 'Trees',
    'insert-delete-getrandom-o1': 'Design', 'random-pick-with-weight': 'Binary Search', 'find-the-duplicate-number': 'Two Pointers',
    'subarray-sum-equals-k': 'Arrays & Hashing', 'contiguous-array': 'Arrays & Hashing', 'is-graph-bipartite': 'Graphs',
    'shortest-subarray-with-sum-at-least-k': 'Stack & Monotonic', 'count-subarrays-with-fixed-bounds': 'Sliding Window',
    'the-skyline-problem': 'Range Queries & Segment Tree', 'swim-in-rising-water': 'DSU & MST',
    'min-cost-to-connect-all-points': 'DSU & MST', 'design-search-autocomplete-system': 'Tries',
    'kth-ancestor-of-a-tree-node': 'Binary Lifting & Euler Tour', 'stream-of-characters': 'Tries',
    'first-letter-to-appear-twice': 'Arrays & Hashing',
}

def lc_category(slug, in_design_list=False):
    if slug in LC_OVERRIDE: return LC_OVERRIDE[slug]
    t = set(tags.get(str(lc[slug]['id']), []))
    if 'concurrency' in t: return 'Concurrency'
    if in_design_list or 'design' in t: return 'Design'
    order = [
        ('trie', 'Tries'), ('union-find', 'DSU & MST'), ('minimum-spanning-tree', 'DSU & MST'),
        ('segment-tree', 'Range Queries & Segment Tree'), ('binary-indexed-tree', 'Range Queries & Segment Tree'),
        ('linked-list', 'Linked List'), ('strongly-connected-component', 'Advanced Graphs'),
        ('biconnected-component', 'Advanced Graphs'), ('shortest-path', 'Advanced Graphs'), ('topological-sort', 'Advanced Graphs'),
        ('binary-tree', 'Trees'), ('tree', 'Trees'), ('binary-search-tree', 'Trees'), ('graph', 'Graphs'),
        ('backtracking', 'Backtracking'), ('bitmask', 'Dynamic Programming'), ('dynamic-programming', 'Dynamic Programming'),
        ('heap-priority-queue', 'Heap / Priority Queue'), ('monotonic-stack', 'Stack & Monotonic'),
        ('monotonic-queue', 'Stack & Monotonic'), ('stack', 'Stack & Monotonic'), ('sliding-window', 'Sliding Window'),
        ('binary-search', 'Binary Search'), ('two-pointers', 'Two Pointers'), ('bit-manipulation', 'Bit Manipulation'),
        ('geometry', 'Geometry'), ('game-theory', 'Game Theory'), ('number-theory', 'Math & Number Theory'),
        ('breadth-first-search', 'Graphs'), ('depth-first-search', 'Graphs'), ('matrix', 'Matrix'),
        ('math', 'Math & Number Theory'), ('greedy', 'Greedy'), ('string', 'Strings & Text Processing'),
    ]
    for tg, c in order:
        if tg in t: return c
    return 'Arrays & Hashing'

DIFF = {1: 'Easy', 2: 'Medium', 3: 'Hard'}
TAG_PRETTY = lambda s: s.replace('-', ' ').title().replace('Bfs', 'BFS')

items = OrderedDict()

def add_lc(slug, source, cat=None, sub=None, in_design=False):
    if slug not in lc:
        print('MISSING LC', slug, source); return
    q = lc[slug]
    key = 'lc:' + slug
    if key not in items:
        items[key] = dict(key=key, title=q['title'], num=q['id'], url=f'https://leetcode.com/problems/{slug}/',
                          platform='LeetCode', diff=DIFF[q['d']], premium=q['paid'],
                          cat=cat or lc_category(slug, in_design), tags=[TAG_PRETTY(x) for x in tags.get(str(q['id']), [])][:4],
                          sources=[], notes=[], videos=[], conf='exact', solved=[])
        if q['ac']: items[key]['solved'].append('LeetCode')
    it = items[key]
    if cat and it['cat'] != cat and source.startswith('Roadmap'):
        it['cat'] = cat  # roadmap pillar wins: it is the user's own study plan
    if source and source not in it['sources']: it['sources'].append(source)
    if sub and sub not in it['notes']: it['notes'].append(sub)
    return it

def add_ext(url, title, platform, diff, cat, source, sub=None, video=None, conf='exact', num=None, key=None):
    key = key or url
    if key not in items:
        items[key] = dict(key=key, title=title, num=num, url=url, platform=platform, diff=diff, premium=False,
                          cat=cat, tags=[], sources=[], notes=[], videos=[], conf=conf, solved=[], pk=url)
    it = items[key]
    if source and source not in it['sources']: it['sources'].append(source)
    if sub and sub not in it['notes']: it['notes'].append(sub)
    if video and video not in it['videos']: it['videos'].append(video)
    rank = {'exact': 0, 'best': 1, 'practice': 2, 'concept': 3, 'search': 4}
    if rank[conf] < rank[it['conf']]: it['conf'] = conf
    return it

# ---------------- 1. curated lists ----------------
for s in B75: add_lc(s, 'Blind 75')
for s in G75: add_lc(s, 'Grind 75')
for s in G169: add_lc(s, 'Grind 169')
for s in DES: add_lc(s, 'LC Design', in_design=True)

# ---------------- 2. ROADMAP.md ----------------
PILLAR_CAT = {1: 'Stack & Monotonic', 2: 'Tries', 3: 'Dynamic Programming', 4: 'Advanced Graphs',
              5: 'Range Queries & Segment Tree', 6: 'DSU & MST', 7: 'Concurrency'}
pillar = None
section = None
row_re = re.compile(r'^\|\s*([0-9A-E]+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.*?)\s*\|?\s*$')
for line in open(ROADMAP, encoding='utf-8'):
    m = re.match(r'^## Pillar (\d)', line)
    if m: pillar = int(m.group(1)); section = None; continue
    if line.startswith('## ') and not line.startswith('## Pillar'): pillar = None; continue
    if line.startswith('**Systems exercises'): section = 'sys'; continue
    if pillar is None: continue
    m = row_re.match(line.strip())
    if not m or m.group(1) == '#': continue
    num, c2, c3, c4 = m.groups()
    if section == 'sys':
        title = re.sub(r'\*\*', '', c2)
        title = re.sub(r'`', '', title)
        link = re.search(r'\[(.+?)\]\((.+?)\)', c3)
        url = link.group(2) if link else 'https://github.com/openjdk/jcstress'
        key = 'sys:' + num
        items[key] = dict(key=key, title=f'Exercise {num}: ' + title.split(' — ')[0].split(', ')[0][:90], num=None,
                          url=url, platform='Systems exercise', diff='', premium=False, cat='Concurrency',
                          tags=[], sources=[f'Roadmap P{pillar}'], notes=['Verify with: ' + re.sub(r'\[(.+?)\]\(.+?\)', r'\1', c3).replace('`', '')],
                          videos=[], conf='exact', solved=[])
        continue
    link = re.search(r'\[(.+?)\]\((.+?)\)', c2)
    if not link: continue
    title, url = link.groups()
    sub = re.sub(r'\*\*|`', '', c4)
    cat = PILLAR_CAT[pillar]
    if pillar == 1 and ('window' in sub.lower() or 'Window' in title): cat = 'Sliding Window'
    if pillar == 2 and re.search(r'XOR|bit', sub + title, re.I) and 'trie' not in sub.lower(): cat = 'Bit Manipulation'
    if pillar == 7 and re.search(r'LRU|LFU', title): cat = 'Design'
    src = f'Roadmap P{pillar}'
    if 'leetcode.com/problems/' in url:
        slug = url.split('/problems/')[1].strip('/').split('/')[0]
        add_lc(slug, src, cat=cat, sub=sub)
    else:
        plat = c3.split(' ')[0]
        diff = c3[len(plat):].strip()
        add_ext(url, title, plat, diff, cat, src, sub=sub)

# ---------------- 3. Pepcoding Level-3 playlists ----------------
JUNK = re.compile(r'Solidity|Rajneesh|Predictive|Level 2|Operating Systems|Leetcode 75|^SQL$|Machine Learning')
def cf_item(code):
    p = cf_by_code[code]
    return (f"https://codeforces.com/problemset/problem/{p['contestId']}/{p['index']}",
            p['name'], 'Codeforces', str(p.get('rating', '')), f"CF {code}")

unresolved = []
playlist = None
for line in open(f'{D}/yt.txt', encoding='utf-8').read().splitlines():
    if line.startswith('## '): playlist = line[3:]; continue
    vt, vid = line.split('\t')
    if JUNK.search(vt): continue
    cat = PLAYLIST_CATEGORY[playlist]
    src = 'Pepcoding L3'
    video = dict(t=vt, u=f'https://www.youtube.com/watch?v={vid}&list={PLAYLIST_URL[playlist]}', p=playlist)
    sub = playlist.replace(' - Level 3', '').replace(' Level 3', '').replace('-Level 3', '')
    hit = next((v for k, v in MANUAL if (vt == k[:-1] if k.endswith('$') else vt.startswith(k))), None)
    vkey = 'pep:' + PLAYLIST_URL[playlist][-6:] + ':' + vid
    if hit is None:
        name = re.split(r'\s*\|\|?\s*|\s+-\s+(?=CSES|Codeforces)', vt)[0].strip()
        c = cf_by_name.get(norm(name), [])
        if len(c) == 1:
            hit = ('cf:' + f"{c[0]['contestId']}{c[0]['index']}", None, 'exact')
        else:
            unresolved.append((playlist, vt, len(c))); continue
    target, disp, conf = hit
    if target.startswith('cf:'):
        url, name, plat, diff, num = cf_item(target[3:])
        add_ext(url, disp or name, plat, diff, cat, src, sub=sub, video=video, conf=conf, num=num, key=vkey)
    elif target == 'concept':
        add_ext(video['u'], disp, 'Concept', '', cat, src, sub=sub + ' — theory lesson, no judge problem', video=video, conf='concept', key=vkey)
    elif target == 'search':
        q = urllib.parse.quote_plus(disp + ' competitive programming problem')
        add_ext(f'https://www.google.com/search?q={q}', disp, 'Search', '', cat, src, sub=sub, video=video, conf='search', key=vkey)
    elif 'leetcode.com/problems/' in target:
        slug = target.split('/problems/')[1].strip('/')
        it = add_lc(slug, src, sub=sub)
        if it is not None:
            if video not in it['videos']: it['videos'].append(video)
            if it['sources'] == ['Pepcoding L3']: it['cat'] = cat
            if conf != 'exact' and it['sources'] == ['Pepcoding L3']: it['conf'] = conf
    else:
        host = urllib.parse.urlparse(target).netloc
        plat = {'cses.fi': 'CSES', 'www.spoj.com': 'SPOJ', 'www.codechef.com': 'CodeChef', 'open.kattis.com': 'Kattis',
                'lightoj.com': 'LightOJ', 'acm.timus.ru': 'Timus', 'www.geeksforgeeks.org': 'GeeksforGeeks'}.get(host, host)
        add_ext(target, disp, plat, '', cat, src, sub=sub, video=video, conf=conf, key=vkey)

for u in unresolved: print('UNRESOLVED', u)

# ---------------- 3b. company interview lists (Company filter) ----------------
from companies import COMPANIES
for company, (entries, page) in COMPANIES.items():
    for note, e in entries:
        if e[0] == 'lc':
            it = add_lc(e[1], None)
        elif e[0] == 'ext':
            _, url, title, plat, cat = e
            it = add_ext(url, title, plat, '', cat, None)
        else:
            _, anchor, title = e
            key = f'{company.lower()}:{anchor}'
            it = items.setdefault(key, dict(key=key, title=title, num=None, url=f'{page}#{anchor}', platform='Concept',
                                            diff='', premium=False, cat='Java 8 Streams', tags=['Java 8', 'Streams'],
                                            sources=[], notes=[], videos=[], conf='concept', solved=[], pk=key))
        if it is None: raise SystemExit(f'{company}: cannot resolve {e}')
        it.setdefault('companies', [])
        if company not in it['companies']: it['companies'].append(company)
        tag = f'{company} guide: {note}'
        if tag not in it['notes']: it['notes'].append(tag)

# ---------------- 4. Notion "done" marks ----------------
NOTION_ALIAS = {'3sum': '3sum', 'invertflipbinarytree': 'invert-binary-tree', 'reversealinkedlist': 'reverse-linked-list',
                'detectcycleinalinkedlist': 'linked-list-cycle', 'wordbreakproblem': 'word-break',
                'lowestcommonancestorofbst': 'lowest-common-ancestor-of-a-binary-search-tree',
                'addandsearchword': 'design-add-and-search-words-data-structure',
                'firstmissingnumberhard': 'first-missing-positive', 'firstmissingnumber': 'first-missing-positive', 'longestvalidparantheses': 'longest-valid-parentheses',
                'generateparanthesis': 'generate-parentheses', 'removenthnodefromendoflist': 'remove-nth-node-from-end-of-list'}
def notion_slug(title):
    n = norm(title)
    if n in NOTION_ALIAS: return NOTION_ALIAS[n]
    if n in lc_by_title: return lc_by_title[n]['slug']
    return None

notion_done = set()
for line in open(f'{D}/notion_blind75.tsv', encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    if len(p) < 2 or not p[0].startswith('numbered_list'): continue
    m = re.match(r'(.+?)\s+-\s+(.*)$', p[1])
    title, status = (m.group(1), m.group(2)) if m else (p[1], '')
    title = re.sub(r'\s*\((Leetcode Premium|Hard)\)', '', title).strip()
    if re.search(r'\bdone\b', status, re.I) or 'O(n' in status:
        s = notion_slug(title)
        if s: notion_done.add(s)
        else: print('NOTION-B75 unmatched', title)
# Grind 75 Notion page: every row is marked Done except Accounts Merge
notion_done.update(s for s in G75 if s != 'accounts-merge')
# Grind 169 Notion page
g169txt = open(f'{D}/notion_grind169.tsv', encoding='utf-8').read()
for line in g169txt.splitlines():
    if not line.startswith('table'): continue
    body = line.split('\t', 1)[1]
    for m in re.finditer(r'(\d+) (.+?) (Easy|Medium|Hard) (.*?)(?= \d+ [A-Z0-9]|$)', body):
        if re.search(r'\bdone\b', m.group(4), re.I):
            s = notion_slug(m.group(2))
            if s: notion_done.add(s)
            else: print('NOTION-G169 unmatched', m.group(2))
for s in notion_done:
    it = items.get('lc:' + s)
    if it and 'Notion' not in it['solved']: it['solved'].append('Notion')

# ---------------- difficulty levels ----------------
from levels import LC_EQUIV, ATCODER_KEY, KATTIS, EST, CODECHEF_RATING, PEPCODING_LEVEL, band_cf, band_atcoder
ac_models = json.load(open(f'{D}/ac_models.json'))
for it in items.values():
    u = it['url'].rstrip('/')
    if it['platform'] == 'LeetCode':
        it['level'], it['lvsrc'] = it['diff'], 'LeetCode'
        continue
    eq = next((s for k, s in LC_EQUIV.items() if u.endswith(k.rstrip('/'))), None)
    if eq:
        q = lc[eq]   # KeyError here = bad slug in levels.py
        it['level'] = DIFF[q['d']]
        it['lvsrc'] = f"via LeetCode #{q['id']} {q['title']}"
        it['lvurl'] = f'https://leetcode.com/problems/{eq}/'
        continue
    if it['platform'] == 'Codeforces' and it['diff'].isdigit():
        it['level'], it['lvsrc'] = band_cf(int(it['diff'])), f"Codeforces rating {it['diff']}"
        continue
    ak = next((k for k in ATCODER_KEY if u.endswith(k)), None)
    if ak and ac_models.get(ak, {}).get('difficulty') is not None:
        r = round(ac_models[ak]['difficulty'])
        it['level'], it['lvsrc'] = band_atcoder(r), f'AtCoder Problems difficulty {r}'
        continue
    if it['platform'] == 'CodeChef' and u.split('/')[-1] in CODECHEF_RATING:
        r = CODECHEF_RATING[u.split('/')[-1]]
        it['level'], it['lvsrc'] = band_cf(r), f'CodeChef difficulty rating {r}'
        continue
    pk_ = next((k for k in PEPCODING_LEVEL if u.endswith(k)), None)
    if pk_:
        it['level'], it['lvsrc'] = PEPCODING_LEVEL[pk_], "Pepcoding's own label for this problem"
        continue
    kk = next((k for k in KATTIS if u.rstrip('/').endswith(k)), None)
    if kk:
        it['level'], it['lvsrc'] = KATTIS[kk], 'Kattis difficulty'
        continue
    est = next((v for k, v in EST.items() if u.endswith(k.rstrip('/'))), None)
    if est:
        it['level'], it['lvsrc'] = est, 'estimate (no comparable rated problem)'
        continue
    it['level'], it['lvsrc'] = '', ''
    if it['platform'] not in ('Search', 'Systems exercise', 'Concept'): print('NO LEVEL', it['platform'], it['title'], u)

# ---------------- output ----------------
out = list(items.values())
for it in out:
    assert it['cat'] in CATS, (it['cat'], it['title'])
SRC_ORDER = ['Blind 75', 'Grind 75', 'Grind 169', 'LC Design'] + [f'Roadmap P{i}' for i in range(1, 8)] + ['Pepcoding L3']
for it in out: it['sources'].sort(key=SRC_ORDER.index)
json.dump(dict(cats=CATS, items=out), open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print('items', len(out), 'solved', sum(1 for i in out if i['solved']))
from collections import Counter
print(Counter(i['cat'] for i in out).most_common())
print(Counter(s for i in out for s in i['sources']))
print('notion-only solved:', [i['title'] for i in out if i['solved'] == ['Notion']])
print('conf', Counter(i['conf'] for i in out))
print('levels', Counter((i['lvsrc'].split(' ')[0] if i['lvsrc'] else '-', i['level']) for i in out if i['platform']!='LeetCode'))
