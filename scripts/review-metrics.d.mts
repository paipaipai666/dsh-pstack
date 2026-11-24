interface PullRequest {
  number: number;
  title: string;
  state: string;
  headRefName: string;
  createdAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  additions: number;
  deletions: number;
}

interface Group {
  total: number;
  merged: number;
  rejected: number;
  mergeRate: number;
  medianHoursToMerge: number | null;
}

interface Bucket {
  name: string;
  automated: number;
  human: number;
}

interface Metrics {
  automated: Group;
  human: Group;
  reverts: number;
  revertRate: number;
  buckets: Bucket[];
}

export function sizeBucket(lines: number): string;
export function summarizePRs(prs: PullRequest[]): Metrics;
export function renderMetrics(metrics: Metrics): string;
