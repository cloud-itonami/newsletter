/**
 * newsletter kotoba — barrel.
 *
 * Per ADR-2606011400. Public newsletter-issue archive (issue + section) on the
 * etzhayyim substrate (AT PDS records; no RW).
 *
 *   issue   : createIssue / setIssueStatus (draft→published→archived) / getIssue / listIssues (title+summary search)
 *   section : addSection (FK→issue, uint order) / listSections (order-sorted)
 *   coverage
 *
 * (c) MIXED SPLIT: the public newsletter-issue archive migrates. The subscriber
 * list (email PII), Resend batch delivery, LangGraph LLM issue generation, and
 * the sponsor/ad slot STAY etzhayyim via consent-capability — NOT in this package.
 */

export * from "./types.js";
export {
  createIssue,
  setIssueStatus,
  getIssue,
  listIssues,
  addSection,
  listSections,
  coverage,
} from "./registry.js";
