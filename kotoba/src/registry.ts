/**
 * newsletter kotoba — issue + section registries + coverage.
 * AT PDS records (no RW). Sections FK→issue. Public newsletter-issue archive;
 * subscriber list + email delivery + LLM generation stay etzhayyim.
 */

import type { Etzhayyim } from "@etzhayyim/sdk";
import {
  ISSUE_COLLECTION,
  ISSUE_STATUSES,
  SECTION_COLLECTION,
  isSlug,
  isUint,
  issueDidFor,
  issueRkey,
  sectionDidFor,
  sectionRkey,
  type AddSectionInput,
  type AddSectionOutput,
  type CoverageInput,
  type CoverageOutput,
  type CreateIssueInput,
  type CreateIssueOutput,
  type GetIssueInput,
  type GetIssueOutput,
  type IssueRecord,
  type IssueView,
  type ListIssuesInput,
  type ListIssuesOutput,
  type ListSectionsInput,
  type ListSectionsOutput,
  type SectionRecord,
  type SectionView,
  type SetIssueStatusInput,
  type SetIssueStatusOutput,
} from "./types.js";

const PAGE_LIMIT = 100;
const DEFAULT_MAX_SCAN = 10_000;

async function exists(e: Etzhayyim, collection: string, rkey: string): Promise<boolean> {
  const resp = await e.read({ collection, rkey }).catch(() => ({ records: [] }));
  return Boolean(resp.records[0]?.value);
}

async function scanAll<T>(e: Etzhayyim, collection: string, maxScan: number, onRow: (v: T) => void): Promise<number> {
  let cursor: string | undefined;
  let scanned = 0;
  while (scanned < maxScan) {
    const page = await e.read<T>({ collection, cursor, limit: PAGE_LIMIT });
    for (const r of page.records) {
      if (scanned >= maxScan) break;
      onRow(r.value);
      scanned += 1;
    }
    if (scanned >= maxScan || !page.cursor || page.records.length < PAGE_LIMIT) break;
    cursor = page.cursor;
  }
  return scanned;
}

// ─── Issue ──────────────────────────────────────────────────────────

export async function createIssue(e: Etzhayyim, input: CreateIssueInput): Promise<CreateIssueOutput> {
  if (!input.issueId || !input.title || !input.slug) return { status: "rejected", error: "missingRequiredFields" };
  if (!isSlug(input.slug.toLowerCase())) return { status: "rejected", error: "invalidSlug" };
  if (input.number != null && !isUint(input.number)) return { status: "rejected", error: "numberMustBeUint" };
  const rkey = issueRkey(input.issueId);
  const existing = await e.read<IssueRecord>({ collection: ISSUE_COLLECTION, rkey }).catch(() => ({ records: [] }));
  if (existing.records[0]?.value) {
    return { status: "alreadyExists", issueUri: existing.records[0].uri, did: existing.records[0].value.did, issueId: input.issueId };
  }
  const did = issueDidFor(input.issueId);
  const now = new Date().toISOString();
  const record: IssueRecord = {
    did,
    issueId: input.issueId,
    title: input.title,
    slug: input.slug.toLowerCase(),
    status: "draft",
    summary: input.summary,
    number: input.number,
    tags: input.tags,
    createdAt: now,
    updatedAt: now,
  };
  const receipt = await e.write({ collection: ISSUE_COLLECTION, record: record as unknown as Record<string, unknown>, rkey });
  return { status: "created", issueUri: receipt.uri, did, issueId: input.issueId };
}

export async function setIssueStatus(e: Etzhayyim, input: SetIssueStatusInput): Promise<SetIssueStatusOutput> {
  if (!input.issueId || !ISSUE_STATUSES.has(input.status)) return { status: "rejected", error: "invalidStatus" };
  const rkey = issueRkey(input.issueId);
  const resp = await e.read<IssueRecord>({ collection: ISSUE_COLLECTION, rkey }).catch(() => ({ records: [] }));
  const issue = resp.records[0]?.value;
  if (!issue) return { status: "notFound", error: "issueNotFound" };
  const now = new Date().toISOString();
  const updated: IssueRecord = {
    ...issue,
    status: input.status,
    publishedAt: input.status === "published" ? input.publishedAt ?? issue.publishedAt ?? now : issue.publishedAt,
    updatedAt: now,
  };
  await e.write({ collection: ISSUE_COLLECTION, record: updated as unknown as Record<string, unknown>, rkey });
  return { status: "updated", issueId: input.issueId, newStatus: input.status };
}

export async function getIssue(e: Etzhayyim, input: GetIssueInput): Promise<GetIssueOutput> {
  if (!input.issueId) return { error: "invalidIssueId" };
  const resp = await e.read<IssueRecord>({ collection: ISSUE_COLLECTION, rkey: issueRkey(input.issueId) }).catch(() => ({ records: [] }));
  const r = resp.records[0];
  if (!r) return { error: "notFound" };
  return { issue: { ...r.value, issueUri: r.uri } };
}

export async function listIssues(e: Etzhayyim, input: ListIssuesInput = {}): Promise<ListIssuesOutput> {
  const limit = Math.min(input.limit ?? 50, 200);
  const resp = await e.read<IssueRecord>({ collection: ISSUE_COLLECTION, cursor: input.cursor, limit });
  const q = input.q?.toLowerCase();
  const items: IssueView[] = resp.records
    .filter((r) => {
      const v = r.value;
      if (input.status && v.status !== input.status) return false;
      if (input.tag && !(v.tags ?? []).includes(input.tag)) return false;
      if (q) {
        const hay = [v.title, v.summary ?? ""].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .map((r) => ({ ...r.value, issueUri: r.uri }));
  return { items, cursor: resp.cursor, total: items.length };
}

// ─── Section ────────────────────────────────────────────────────────

export async function addSection(e: Etzhayyim, input: AddSectionInput): Promise<AddSectionOutput> {
  if (!input.sectionId || !input.issueId || !input.heading) return { status: "rejected", error: "missingRequiredFields" };
  if (!isUint(input.order)) return { status: "rejected", error: "orderMustBeUint" };
  if (!(await exists(e, ISSUE_COLLECTION, issueRkey(input.issueId)))) {
    return { status: "issueNotFound", error: `issueNotFound:${input.issueId}` };
  }
  const rkey = sectionRkey(input.sectionId);
  const existing = await e.read<SectionRecord>({ collection: SECTION_COLLECTION, rkey }).catch(() => ({ records: [] }));
  if (existing.records[0]?.value) {
    return { status: "alreadyExists", sectionUri: existing.records[0].uri, did: existing.records[0].value.did, sectionId: input.sectionId };
  }
  const did = sectionDidFor(input.sectionId);
  const record: SectionRecord = {
    did,
    sectionId: input.sectionId,
    issueId: input.issueId,
    heading: input.heading,
    body: input.body ?? "",
    order: input.order,
    sourceUrl: input.sourceUrl,
    createdAt: new Date().toISOString(),
  };
  const receipt = await e.write({ collection: SECTION_COLLECTION, record: record as unknown as Record<string, unknown>, rkey });
  return { status: "added", sectionUri: receipt.uri, did, sectionId: input.sectionId };
}

export async function listSections(e: Etzhayyim, input: ListSectionsInput = {}): Promise<ListSectionsOutput> {
  const limit = Math.min(input.limit ?? 50, 200);
  const resp = await e.read<SectionRecord>({ collection: SECTION_COLLECTION, cursor: input.cursor, limit });
  const items: SectionView[] = resp.records
    .filter((r) => !input.issueId || r.value.issueId === input.issueId)
    .map((r) => ({ ...r.value, sectionUri: r.uri }))
    .sort((a, b) => a.order - b.order);
  return { items, cursor: resp.cursor, total: items.length };
}

// ─── Coverage ───────────────────────────────────────────────────────

export async function coverage(e: Etzhayyim, input: CoverageInput = {}): Promise<CoverageOutput> {
  const maxScan = Math.min(input.maxScan ?? DEFAULT_MAX_SCAN, DEFAULT_MAX_SCAN);
  const issuesByStatus: Record<string, number> = {};
  const issueCount = await scanAll<IssueRecord>(e, ISSUE_COLLECTION, maxScan, (v) => {
    issuesByStatus[v.status] = (issuesByStatus[v.status] ?? 0) + 1;
  });
  const sectionCount = await scanAll<SectionRecord>(e, SECTION_COLLECTION, maxScan, () => {});
  return {
    issueCount,
    sectionCount,
    issuesByStatus,
    truncated: issueCount >= maxScan || sectionCount >= maxScan,
  };
}
