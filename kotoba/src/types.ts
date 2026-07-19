/**
 * newsletter kotoba — public newsletter-issue archive: issue + section.
 *
 * Per ADR-2606011400 (Consensys pattern) + ADR-2605172400 (3-axis OR-test).
 *
 * SPLIT (this app is (c) mixed — a Newsletter Factory):
 *   PUBLIC (THIS PACKAGE) — published newsletter issues + their sections. These
 *   are first-party consumer content (a public newsletter archive, like a blog /
 *   Substack public web archive). No PII, no settlement, no liability on the
 *   published issue itself. → migrated to etzhayyim front (AT PDS records).
 *
 *   REGULATED (STAYS etzhayyim, NOT in this package) — the subscriber list (email
 *   addresses + personalization = Custody), Resend batch delivery (email-send
 *   Liability / unsubscribe compliance), LangGraph LLM issue generation (compute),
 *   and the optional sponsor/ad slot (Settlement). Consumed via consent-capability.
 *
 * AT-Lexicon: no float. Section order is an integer.
 *
 * Identity hierarchy:
 *   did:web:newsletter.etzhayyim.com                       — controller
 *   did:web:newsletter.etzhayyim.com:issue:{issueId}       — a newsletter issue
 *   did:web:newsletter.etzhayyim.com:sec:{sectionId}       — an issue section
 */

export const NEWSLETTER_DID_PREFIX = "did:web:newsletter.etzhayyim.com:" as const;

export const ISSUE_COLLECTION = "com.etzhayyim.apps.newsletter.issue";
export const SECTION_COLLECTION = "com.etzhayyim.apps.newsletter.section";

// ─── Enums ──────────────────────────────────────────────────────────

export type IssueStatus = "draft" | "published" | "archived";

export const ISSUE_STATUSES: ReadonlySet<string> = new Set(["draft", "published", "archived"]);

// ─── Issue ──────────────────────────────────────────────────────────

export interface IssueRecord {
  did: string;
  issueId: string;
  title: string;
  slug: string;
  status: IssueStatus;
  summary?: string;
  /** Issue number, integer (optional). */
  number?: number;
  tags?: string[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface IssueView extends IssueRecord {
  issueUri: string;
}
export interface CreateIssueInput {
  issueId: string;
  title: string;
  slug: string;
  summary?: string;
  number?: number;
  tags?: string[];
}
export interface CreateIssueOutput {
  status: "created" | "alreadyExists" | "rejected";
  issueUri?: string;
  did?: string;
  issueId?: string;
  error?: string;
}
export interface SetIssueStatusInput {
  issueId: string;
  status: IssueStatus;
  publishedAt?: string;
}
export interface SetIssueStatusOutput {
  status: "updated" | "rejected" | "notFound";
  issueId?: string;
  newStatus?: IssueStatus;
  error?: string;
}
export interface GetIssueInput {
  issueId: string;
}
export interface GetIssueOutput {
  issue?: IssueView;
  error?: string;
}
export interface ListIssuesInput {
  status?: IssueStatus;
  tag?: string;
  q?: string;
  limit?: number;
  cursor?: string;
}
export interface ListIssuesOutput {
  items: IssueView[];
  cursor?: string;
  total: number;
}

// ─── Section (FK→issue) ─────────────────────────────────────────────

export interface SectionRecord {
  did: string;
  sectionId: string;
  /** FK → issue. */
  issueId: string;
  heading: string;
  body: string;
  order: number;
  sourceUrl?: string;
  createdAt: string;
}
export interface SectionView extends SectionRecord {
  sectionUri: string;
}
export interface AddSectionInput {
  sectionId: string;
  issueId: string;
  heading: string;
  body: string;
  order: number;
  sourceUrl?: string;
}
export interface AddSectionOutput {
  status: "added" | "alreadyExists" | "rejected" | "issueNotFound";
  sectionUri?: string;
  did?: string;
  sectionId?: string;
  error?: string;
}
export interface ListSectionsInput {
  issueId?: string;
  limit?: number;
  cursor?: string;
}
export interface ListSectionsOutput {
  items: SectionView[];
  cursor?: string;
  total: number;
}

// ─── Coverage ───────────────────────────────────────────────────────

export interface CoverageInput {
  maxScan?: number;
}
export interface CoverageOutput {
  issueCount?: number;
  sectionCount?: number;
  issuesByStatus?: Record<string, number>;
  truncated?: boolean;
  error?: string;
}

// ─── Validation + helpers ───────────────────────────────────────────

export function isUint(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}
export function isSlug(s: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

export function issueDidFor(id: string): string {
  return `${NEWSLETTER_DID_PREFIX}issue:${id.toLowerCase()}`;
}
export function issueRkey(id: string): string {
  return `issue-${id.toLowerCase()}`;
}
export function sectionDidFor(id: string): string {
  return `${NEWSLETTER_DID_PREFIX}sec:${id.toLowerCase()}`;
}
export function sectionRkey(id: string): string {
  return `sec-${id.toLowerCase()}`;
}
