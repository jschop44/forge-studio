import assert from "node:assert/strict";
import test from "node:test";
import { RemovableLearningMemory } from "../src/lib/removable-learning-memory";
const observation = (projectId: string) => ({
  source: "owner-feedback", projectId, category: "navigation",
  finding: "Navigation clarity needs improvement", outcome: "helpful",
  recordedAt: "2026-11-06T04:00:00Z",
});
test("memory is opt-in, project-scoped and removable", () => {
  const memory = new RemovableLearningMemory();
  assert.equal(memory.add(observation("a")), false);
  memory.setEnabled(true);
  assert.equal(memory.add(observation("a")), true);
  assert.equal(memory.add(observation("b")), true);
  assert.equal(memory.summarize("a").total, 1);
  assert.equal(memory.clear("a"), 1);
  assert.equal(memory.export("a").length, 0);
  assert.equal(memory.export("b").length, 1);
  assert.equal(memory.clear(), 1);
  assert.equal(memory.summarize().total, 0);
});
