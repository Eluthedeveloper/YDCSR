-- Add foreign key constraints to the YDCS Radio Home database.
-- Run from the backend directory: node scripts/run_sql.js scripts/add_fk_constraints.sql
--
-- This cleans orphaned rows left over from before constraints existed, then
-- adds referential integrity so future deletes are always guarded.

-- 1) Remove orphaned rows referencing already-deleted users
DELETE a FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id WHERE u.id IS NULL;
DELETE t FROM refresh_tokens t LEFT JOIN users u ON t.user_id = u.id WHERE u.id IS NULL;

-- 2) Add constraints
ALTER TABLE refresh_tokens
  ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE regions
  ADD CONSTRAINT fk_regions_state FOREIGN KEY (regional_state_id) REFERENCES regional_states(id) ON DELETE RESTRICT;

ALTER TABLE churches
  ADD CONSTRAINT fk_churches_region FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT;

ALTER TABLE radio_home_groups
  ADD CONSTRAINT fk_rhg_region FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_rhg_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_rhg_church FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_rhg_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE media
  ADD CONSTRAINT fk_media_group FOREIGN KEY (group_id) REFERENCES radio_home_groups(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_media_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE reports
  ADD CONSTRAINT fk_reports_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE audit_logs
  ADD CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
