export interface CommentFinding {
  file: string;
  line: number;
  text: string;
}

export function isComment(line: string): boolean;
export function isAllowedComment(line: string): boolean;
export function isTestPath(file: string): boolean;
export function isGatedPath(file: string): boolean;
export function parseAddedComments(diff: string): CommentFinding[];
