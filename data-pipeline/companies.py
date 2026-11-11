"""Company interview lists. Each entry tags problems with a company; the app shows them under the Company filter.

Entry shapes:
  ('lc', slug)                                  a LeetCode problem (added to the tracker if it is not there yet)
  ('ext', url, title, platform, cat)            a problem on another site
  ('page', anchor, title)                       a question answered on a page served by the app (public/<page>)
Every entry carries a note: where it sits in the company's prep guide.
"""

EPAM_STREAMS_PAGE = '/epam/java8-streams.html'

# Source: an EPAM (Bengaluru, Java + React full stack, 6 YOE) 45-minute DSA-round prep guide.
EPAM = [
    # Priority 1: arrays and strings
    ('P1 #1 Two Sum', ('lc', 'two-sum')),
    ('P1 #2 First non-repeating character', ('lc', 'first-unique-character-in-a-string')),
    ('P1 #3 First repeating character', ('lc', 'first-letter-to-appear-twice')),
    ('P1 #4 Group Anagrams', ('lc', 'group-anagrams')),
    ('P1 #5 Longest Substring Without Repeating Characters', ('lc', 'longest-substring-without-repeating-characters')),
    ('P1 #6 Longest Consecutive Sequence', ('lc', 'longest-consecutive-sequence')),
    ('P1 #7 Product of Array Except Self', ('lc', 'product-of-array-except-self')),
    ('P1 #8 Maximum Subarray Sum (Kadane)', ('lc', 'maximum-subarray')),
    ('P1 #9 Merge Overlapping Intervals', ('lc', 'merge-intervals')),
    ('P1 #10 Find all missing numbers in a range', ('lc', 'find-all-numbers-disappeared-in-an-array')),
    ('P1 #11 Sort elements based on a condition (custom comparator)', ('lc', 'sort-array-by-increasing-frequency')),
    ('P1 #12 Rotate Array by K positions', ('lc', 'rotate-array')),
    # Priority 2: sliding window and two pointers
    ('P2 #13 Maximum sum subarray of size K', ('lc', 'maximum-average-subarray-i')),
    ('P2 #14 Minimum size subarray sum', ('lc', 'minimum-size-subarray-sum')),
    ('P2 #15 Longest substring with at most K distinct characters', ('lc', 'longest-substring-with-at-most-k-distinct-characters')),
    ('P2 #15 At most K distinct (free version, K = 2)', ('lc', 'fruit-into-baskets')),
    ('P2 #16 Longest repeating character replacement', ('lc', 'longest-repeating-character-replacement')),
    ('P2 #17 Valid Palindrome', ('lc', 'valid-palindrome')),
    ('P2 #18 3Sum', ('lc', '3sum')),
    ('P2 #19 Container With Most Water', ('lc', 'container-with-most-water')),
    ('P2 #20 Move Zeroes', ('lc', 'move-zeroes')),
    ('P2 #21 Trapping Rain Water', ('lc', 'trapping-rain-water')),
    # Priority 3: binary search and sorting
    ('P3 #22 Binary Search', ('lc', 'binary-search')),
    ('P3 #23 Search in Rotated Sorted Array', ('lc', 'search-in-rotated-sorted-array')),
    ('P3 #24 Find First and Last Position of Element', ('lc', 'find-first-and-last-position-of-element-in-sorted-array')),
    ('P3 #25 Find Peak Element', ('lc', 'find-peak-element')),
    ('P3 #26 Kth Largest Element in an Array', ('lc', 'kth-largest-element-in-an-array')),
    ('P3 #27 Sort an array of 0s, 1s and 2s', ('lc', 'sort-colors')),
    ('P3 #28 Merge Two Sorted Arrays', ('lc', 'merge-sorted-array')),
    # Priority 4: dynamic programming
    ('P4 #29 Climbing Stairs', ('lc', 'climbing-stairs')),
    ('P4 #30 House Robber', ('lc', 'house-robber')),
    ('P4 #31 Coin Change', ('lc', 'coin-change')),
    ('P4 #32 Partition Equal Subset Sum', ('lc', 'partition-equal-subset-sum')),
    ('P4 #33 Longest Increasing Subsequence', ('lc', 'longest-increasing-subsequence')),
    ('P4 #34 Longest Common Subsequence', ('lc', 'longest-common-subsequence')),
    ('P4 #35 0/1 Knapsack', ('ext', 'https://www.geeksforgeeks.org/problems/0-1-knapsack-problem0945/1',
                             '0/1 Knapsack', 'GeeksforGeeks', 'Dynamic Programming')),
    ('P4 #36 Minimum Edit Distance', ('lc', 'edit-distance')),
    # Priority 5: linked lists, stack and trees
    ('P5 #37 Reverse a Linked List', ('lc', 'reverse-linked-list')),
    ('P5 #38 Detect Cycle in Linked List', ('lc', 'linked-list-cycle')),
    ('P5 #39 Find Middle of Linked List', ('lc', 'middle-of-the-linked-list')),
    ('P5 #40 Valid Parentheses', ('lc', 'valid-parentheses')),
    ('P5 #41 Next Greater Element', ('lc', 'next-greater-element-i')),
    ('P5 #42 Binary Tree Level Order Traversal', ('lc', 'binary-tree-level-order-traversal')),
    ('P5 #43 Maximum Depth of Binary Tree', ('lc', 'maximum-depth-of-binary-tree')),
    ('P5 #44 Validate Binary Search Tree', ('lc', 'validate-binary-search-tree')),
    # Java 8 Streams coding (answers on the page served by the app)
    ('Streams #1', ('page', 'q1', 'Second-highest number in a list')),
    ('Streams #2', ('page', 'q2', 'Duplicate elements in a list')),
    ('Streams #3', ('page', 'q3', 'Frequency of each character in a string')),
    ('Streams #4', ('page', 'q4', 'Group employees by department')),
    ('Streams #5', ('page', 'q5', 'Highest-paid employee in each department')),
    ('Streams #6', ('page', 'q6', 'Sort employees by salary, descending')),
    ('Streams #7', ('page', 'q7', 'First non-repeating character (Streams)')),
    ('Streams #8', ('page', 'q8', 'Convert a list of lists into a single list')),
    ('Streams #9', ('page', 'q9', 'Partition numbers into even and odd')),
    ('Streams #10', ('page', 'q10', 'Top 3 highest-paid employees')),
    ('Streams #11', ('page', 'q11', 'Most frequent word in a list of sentences')),
    ('Streams #12', ('page', 'q12', 'Sum of salaries by department')),
]

COMPANIES = {'EPAM': (EPAM, EPAM_STREAMS_PAGE)}
