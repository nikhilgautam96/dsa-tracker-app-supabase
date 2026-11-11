export type Confidence = 'exact' | 'best' | 'practice' | 'concept' | 'search';

export interface Video {
  /** video title */
  t: string;
  /** video url */
  u: string;
  /** playlist name */
  p: string;
}

export interface Problem {
  /** unique row key */
  key: string;
  /** problem key: rows pointing at the same problem share it (and share one checkbox) */
  pk: string;
  title: string;
  num: string | number | null;
  url: string;
  platform: string;
  /** native difficulty text (LeetCode Easy/Medium/Hard, Codeforces rating, …) */
  diff: string;
  premium: boolean;
  cat: string;
  tags: string[];
  sources: string[];
  /** companies whose interview lists include this problem (Company filter) */
  companies?: string[];
  notes: string[];
  videos: Video[];
  conf: Confidence;
  /** Easy | Medium | Hard | '' */
  level: string;
  /** where the level came from */
  lvsrc: string;
  /** link to the referenced problem when the level was borrowed */
  lvurl?: string;
}

export interface ProblemData {
  cats: string[];
  items: Problem[];
}

/** Per-version state of one problem. */
export interface Entry {
  solved: boolean;
  solutionUrl: string | null;
  /** solved before solution links were required; the app asks for a link */
  needsLink: boolean;
  revisit: boolean;
  solvedAt: string | null;
}

export interface TrackerVersion {
  id: string;
  name: string;
  created_at: string;
}

export type Level = 'Easy' | 'Medium' | 'Hard';
export type Status = 'All' | 'Unsolved' | 'Solved';

export interface Filters {
  cat: Set<string>;
  src: Set<string>;
  plat: Set<string>;
  company: Set<string>;
  level: Set<Level>;
  status: Status;
  revisit: boolean;
  missingLink: boolean;
  q: string;
}

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';
