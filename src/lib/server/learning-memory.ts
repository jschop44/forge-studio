import { database } from "./db";

/** Opt-in persistent learning observations, isolated by authenticated owner.
 * Dropping this table removes the module's stored data.
 */
export async function initializeLearningMemory() {
  const sql = database();
  await sql`CREATE TABLE IF NOT EXISTS forge_learning_observations (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES forge_users(id) ON DELETE CASCADE,
    project_key TEXT NOT NULL,
    observation JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS forge_learning_observations_owner_project ON forge_learning_observations(owner_id,project_key,created_at DESC)`;
}
