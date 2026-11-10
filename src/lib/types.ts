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

export type Level = 'All' | 'Easy' | 'Medium' | 'Hard';
export type Status = 'All' | 'Unsolved' | 'Solved';

export interface Filters {
  cat: Set<string>;
  src: Set<string>;
  plat: Set<string>;
  status: Status;
  level: Level;
  q: string;
}

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';
