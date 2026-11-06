import type { LearningObservation } from "./learning-observations";
import { LearningObservationSchema, summarizeLearningObservations } from "./learning-observations";

/**
 * In-memory, explicitly controlled observation collection for test/private beta.
 * No persistence, network calls, hidden collection, or model training.
 */
export class RemovableLearningMemory {
  private entries: LearningObservation[] = [];
  private enabled = false;

  setEnabled(enabled: boolean) { this.enabled = enabled; }
  add(input: unknown): boolean {
    if (!this.enabled) return false;
    const entry = LearningObservationSchema.parse(input);
    if (this.entries.length >= 1000) this.entries.shift();
    this.entries.push(entry);
    return true;
  }
  summarize(projectId?: string) {
    return summarizeLearningObservations(this.entries.filter(entry => !projectId || entry.projectId === projectId));
  }
  export(projectId?: string): LearningObservation[] {
    return this.entries.filter(entry => !projectId || entry.projectId === projectId).map(entry => ({...entry}));
  }
  clear(projectId?: string) {
    const before = this.entries.length;
    this.entries = projectId ? this.entries.filter(entry => entry.projectId !== projectId) : [];
    return before - this.entries.length;
  }
}
