-- Per-workspace automation settings for the scheduled intelligence loop ({ enabled, cadenceMs }).
-- IF NOT EXISTS because this column was applied to the dev database under an earlier migration
-- number (0009_rainy_zarek) before the main->shihab-restructure merge renumbered it; re-running it
-- on that database must be a no-op rather than an error.
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "automation_config" jsonb;
