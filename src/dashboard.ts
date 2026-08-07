// The "Need it in a hurry" shortcuts on the front page.
//
// Each entry is a page's slug — that's the markdown filename in
// src/content/procedures without the .md on the end. Reorder them, add more,
// or remove any you don't want. Anything that doesn't match a real page is
// quietly skipped, so a typo can't break the page.
export const QUICK_LINKS: string[] = [
  'health-and-safety-policy',
  'sickness-and-absence-policy',
  'company-contact-details',
  'grievance-procedure',
];

// How many entries to show under "Recently updated".
export const RECENT_COUNT = 5;
