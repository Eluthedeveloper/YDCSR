-- Merge duplicate churches (same name + same region) and enforce uniqueness.
-- Run from the backend directory: node scripts/run_sql.js scripts/dedupe_churches.sql
--
-- IMPORTANT: run this BEFORE `npm run db:push` so the unique index
-- (church_name_region_idx) can be created without duplicate-key errors.

-- 1) Re-point every radio_home_group at the kept (lowest-id) church for its name+region
UPDATE radio_home_groups g
JOIN churches dup ON g.church_id = dup.id
JOIN churches keep ON keep.name = dup.name AND keep.region_id = dup.region_id AND keep.id < dup.id
SET g.church_id = keep.id;

-- 2) Delete the now-unreferenced duplicate churches
DELETE dup FROM churches dup
LEFT JOIN radio_home_groups g ON g.church_id = dup.id
WHERE g.church_id IS NULL
  AND EXISTS (
    SELECT 1 FROM churches keep
    WHERE keep.name = dup.name AND keep.region_id = dup.region_id AND keep.id < dup.id
  );

-- 3) Enforce uniqueness at the database level so duplicates can never be created again
ALTER TABLE churches
  ADD UNIQUE INDEX church_name_region_idx (name, region_id);
