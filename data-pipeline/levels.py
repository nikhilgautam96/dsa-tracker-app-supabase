# Difficulty for non-LeetCode problems.
# Priority: (1) same/similar problem on LeetCode -> LeetCode's label
#           (2) Codeforces official rating, banded
#           (3) AtCoder Problems (kenkoooo) estimated difficulty, banded
#           (4) Kattis's own label
#           (5) estimate ('est') when no comparable rated problem exists
# Keys are matched against the item URL with endswith().

CS = 'cses.fi/problemset/task/'
SP = 'spoj.com/problems/'

# url-suffix -> LeetCode slug of an equivalent problem with comparable constraints/approach
LC_EQUIV = {
    'geeksforgeeks.org/problems/0-1-knapsack-problem0945/1': 'partition-equal-subset-sum',
    CS + '2205': 'gray-code',
    CS + '1653': 'minimum-number-of-work-sessions-to-finish-the-tasks',
    CS + '1133': 'sum-of-distances-in-tree',
    CS + '1668': 'possible-bipartition',
    CS + '1696': 'maximum-number-of-accepted-invitations',
    CS + '1649': 'range-sum-query-mutable',
    CS + '1651': 'range-addition',
    CS + '1675': 'connecting-cities-with-minimum-cost',
    CS + '1676': 'number-of-connected-components-in-an-undirected-graph',
    CS + '1677': 'bricks-falling-when-hit',
    CS + '1095': 'powx-n',
    CS + '1712': 'super-pow',
    CS + '1662': 'subarray-sums-divisible-by-k',
    CS + '1753': 'find-the-index-of-the-first-occurrence-in-a-string',
    CS + '1111': 'longest-palindromic-substring',
    SP + 'FINDSR/': 'repeated-substring-pattern',
    CS + '1732': 'longest-happy-prefix',
    SP + 'NAJPF/': 'find-the-index-of-the-first-occurrence-in-a-string',
    CS + '2105': 'number-of-distinct-substrings-in-a-string',
    CS + '2106': 'longest-duplicate-substring',
    CS + '1646': 'range-sum-query-immutable',
    CS + '1648': 'range-sum-query-mutable',
    SP + 'FENTREE/': 'range-sum-query-mutable',
    CS + '1739': 'range-sum-query-2d-mutable',
    CS + '2195': 'erect-the-fence',
    'abc032/tasks/abc032_c': 'subarray-product-less-than-k',
}

ATCODER_KEY = ['abc032_c', 'abc141_f', 'abc147_d', 'abc218_e', 'abc235_e']   # looked up in kenkoooo models

KATTIS = {'generalchineseremainder': 'Easy', 'repeatedsubstrings': 'Hard'}

# url-suffix -> estimated level (no comparable rated problem exists)
EST = {
    CS + '1645': 'Medium', CS + '1077': 'Hard', CS + '1623': 'Easy', CS + '1690': 'Hard', CS + '1130': 'Medium',
    'dp/tasks/dp_o': 'Hard', 'dp/tasks/dp_p': 'Medium', 'dp/tasks/dp_s': 'Medium', 'dp/tasks/dp_v': 'Hard',
    CS + '1683': 'Medium', CS + '1686': 'Hard', CS + '1684': 'Hard',
    'practice2/tasks/practice2_g': 'Medium', 'practice2/tasks/practice2_d': 'Hard', 'practice2/tasks/practice2_h': 'Hard',
    CS + '1735': 'Hard', CS + '1190': 'Hard',
    'practice2/tasks/practice2_j': 'Medium', 'practice2/tasks/practice2_k': 'Hard', 'practice2/tasks/practice2_l': 'Hard',
    'practice2/tasks/practice2_a': 'Easy',
    SP + 'CEQU/': 'Medium', SP + 'ETF/': 'Easy', SP + 'DCEPC11B/': 'Medium', CS + '1079': 'Medium',
    SP + 'FACTCG2/': 'Easy', CS + '1713': 'Easy', CS + '1082': 'Medium', CS + '2185': 'Medium',
    'monkey-tradition': 'Medium',
    SP + 'LCS/': 'Hard', SP + 'MINMOVE/': 'Medium', CS + '2110': 'Hard', CS + '2108': 'Hard', SP + 'LCS2/': 'Hard',
    CS + '2103': 'Hard', CS + '2102': 'Medium', CS + '2104': 'Hard', 'num=1269': 'Hard', SP + 'SUB_PROB/': 'Medium',
    CS + '1647': 'Easy', SP + 'RACETIME/': 'Hard', SP + 'GIVEAWAY/': 'Hard', SP + 'RMQSQ/': 'Easy',
    CS + '2189': 'Easy', CS + '2190': 'Medium', CS + '2191': 'Easy', CS + '2192': 'Medium', CS + '2193': 'Medium',
    SP + 'KGSS/': 'Medium', SP + 'SEGSQRSS/': 'Hard', SP + 'LITE/': 'Medium', SP + 'MULTQ3/': 'Medium',
    SP + 'MKTHNUM/': 'Hard', SP + 'KQUERY/': 'Hard',
    CS + '1729': 'Easy', CS + '1730': 'Easy', CS + '1098': 'Medium', CS + '2207': 'Hard',
    CS + '1688': 'Medium', CS + '2134': 'Hard', CS + '1137': 'Medium', CS + '1135': 'Medium', CS + '1138': 'Medium',
}

def band_cf(r):      # Codeforces rating -> level
    return 'Easy' if r <= 1200 else ('Medium' if r <= 1800 else 'Hard')

def band_atcoder(r): # AtCoder Problems difficulty -> level
    return 'Easy' if r < 800 else ('Medium' if r < 1600 else 'Hard')

# CodeChef publishes difficulty ratings (checked via codechef.com/api/contests/PRACTICE/problems/<CODE>)
CODECHEF_RATING = {'NMNMX': 1957, 'MANRECT': 1895, 'CLOSCHEF': 1777, 'UPDOTR': 2715, 'LGSEG': 2529, 'REMONE': 1700, 'DIVMAC': 2069}

# Level shown on Pepcoding's own problem page (seen in the video) for problems whose judge has no rating
PEPCODING_LEVEL = {'problems/CATS': 'Hard', 'a-modified-game-of-nim': 'Medium'}

EST.update({'problems/BUDDYNIM': 'Medium', 'problems/TREEDGE': 'Hard'})
