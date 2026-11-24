export interface ChecklistItem {
  id: string;
  trigger: string[];
  check: string;
  history?: string;
}

export function globToRegExp(pattern: string): RegExp;
export function parseChecklist(markdown: string): ChecklistItem[];
export function selectItems(items: ChecklistItem[], files: string[]): ChecklistItem[];
export function renderReport(items: ChecklistItem[]): string;
