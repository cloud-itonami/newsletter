import { describe, it, expect, beforeEach } from "vitest";
import { MockEtzhayyim } from "@etzhayyim/sdk-mock";
import {
  createIssue,
  setIssueStatus,
  getIssue,
  listIssues,
  addSection,
  listSections,
  coverage,
} from "../src/index.js";

describe("newsletter kotoba", () => {
  let e: any;
  beforeEach(() => {
    e = new MockEtzhayyim({ did: "did:web:newsletter.etzhayyim.com" });
  });

  describe("issue archive", () => {
    it("creates issues (slug + uint number validated), publishes, reads, searches", async () => {
      expect((await createIssue(e, { issueId: "i-22", title: "Weekly #22", slug: "weekly-22", summary: "this week in tech", number: 22, tags: ["tech"] })).status).toBe("created");
      expect((await getIssue(e, { issueId: "i-22" })).issue?.status).toBe("draft");
      expect((await createIssue(e, { issueId: "i-X", title: "x", slug: "Bad Slug!" })).status).toBe("rejected"); // slug
      expect((await createIssue(e, { issueId: "i-N", title: "n", slug: "n", number: 2.5 as any })).status).toBe("rejected"); // number
      expect((await setIssueStatus(e, { issueId: "i-22", status: "published" })).newStatus).toBe("published");
      expect((await getIssue(e, { issueId: "i-22" })).issue?.publishedAt).toBeTruthy();
      expect((await setIssueStatus(e, { issueId: "GHOST", status: "published" })).status).toBe("notFound");
      expect((await listIssues(e, { status: "published", tag: "tech" })).total).toBe(1);
      expect((await listIssues(e, { q: "this week" })).total).toBe(1);
    });
  });

  describe("sections FK→issue", () => {
    beforeEach(async () => {
      await createIssue(e, { issueId: "i-1", title: "Issue 1", slug: "issue-1" });
    });
    it("adds sections (FK→issue, uint order), order-sorted, rejects missing issue", async () => {
      expect((await addSection(e, { sectionId: "s-2", issueId: "i-1", heading: "Markets", body: "...", order: 2 })).status).toBe("added");
      expect((await addSection(e, { sectionId: "s-1", issueId: "i-1", heading: "Headlines", body: "...", order: 1 })).status).toBe("added");
      expect((await addSection(e, { sectionId: "s-F", issueId: "i-1", heading: "x", body: "y", order: 1.5 as any })).status).toBe("rejected"); // order float
      expect((await addSection(e, { sectionId: "s-G", issueId: "ghost", heading: "x", body: "y", order: 1 })).status).toBe("issueNotFound");
      const secs = await listSections(e, { issueId: "i-1" });
      expect(secs.total).toBe(2);
      expect(secs.items[0].heading).toBe("Headlines"); // order-sorted
    });
    it("coverage rolls up issues + sections by status", async () => {
      await setIssueStatus(e, { issueId: "i-1", status: "published" });
      await createIssue(e, { issueId: "i-2", title: "Draft", slug: "draft" });
      await addSection(e, { sectionId: "s-1", issueId: "i-1", heading: "h", body: "b", order: 1 });
      const cov = await coverage(e);
      expect(cov.issueCount).toBe(2);
      expect(cov.sectionCount).toBe(1);
      expect(cov.issuesByStatus?.published).toBe(1);
      expect(cov.issuesByStatus?.draft).toBe(1);
    });
  });
});
