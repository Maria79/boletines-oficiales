import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_ENTRIES, DEMO_ORGANIZATIONS, SOURCE_LABELS,
  filterDemoEntries, relevanceExamples, sampleSummary,
} from "./fixtures.ts";

test("fictional dataset is stable, covers all bulletin source categories and has no real client fields", () => {
  assert.equal(DEMO_ENTRIES.length, 16);
  assert.equal(DEMO_ORGANIZATIONS.length, 3);
  assert.deepEqual(sampleSummary(DEMO_ENTRIES), {
    count: 16, sources: 5, categories: 9,
  });
  const allSources = new Set(DEMO_ENTRIES.map(entry => entry.source));
  assert.deepEqual([...allSources].sort(), Object.keys(SOURCE_LABELS).sort());
  assert.equal(new Set(DEMO_ENTRIES.map(entry => entry.id)).size, DEMO_ENTRIES.length);
  for (const entry of DEMO_ENTRIES) {
    assert.match(entry.title, /Ejemplo ficticio/i);
    assert.match(entry.publishedAt, /^2026-\d\d-\d\d$/);
    assert.ok(entry.excerpt.length > 25);
    assert.equal("nif" in entry, false);
    assert.equal("url" in entry, false);
    assert.equal("contactInfo" in entry, false);
  }
  for (const org of DEMO_ORGANIZATIONS) {
    assert.match(org.name, /ficticio/i);
    assert.equal("nif" in org, false);
    assert.equal("email" in org, false);
  }
});

test("search, source and category filters behave together", () => {
  assert.equal(filterDemoEntries(DEMO_ENTRIES, {}).length, 16);
  const selected = filterDemoEntries(DEMO_ENTRIES, {
    source: "BOC", category: "Subvenciones", query: "comercios",
  });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, 102);
  assert.equal(filterDemoEntries(DEMO_ENTRIES, { query: "NONEXISTENT" }).length, 0);
  assert.equal(filterDemoEntries(DEMO_ENTRIES, { query: "DIGITALIZACIÓN" }).length > 0, true);
});

test("illustrative matching is deterministic and each score is explainable", () => {
  for (const org of DEMO_ORGANIZATIONS) {
    const rows = relevanceExamples(org);
    assert.ok(rows.length > 1);
    assert.deepEqual(rows, relevanceExamples(org));
    for (const row of rows) {
      assert.ok(row.matchingTags.length >= 1);
      assert.equal(row.sampleScore, row.matchingTags.length * 35);
      assert.ok(row.matchingTags.every(tag => org.interests.includes(tag)));
      assert.ok(row.matchingTags.every(tag => row.entry.tags.includes(tag)));
    }
  }
});
