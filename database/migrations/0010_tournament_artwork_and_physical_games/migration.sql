ALTER TABLE "Tournament" ADD COLUMN "imageUrl" TEXT;

INSERT INTO "Game" ("id", "name", "slug", "description", "supportedMode", "formats", "isActive", "createdAt", "updatedAt") VALUES
  ('10000000-0000-4000-8000-000000000001', 'Snooker', 'snooker', 'Cue-sport tournaments with structured frames, officiating, and knockout brackets.', 'Individual', '["Single elimination","Round robin"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000002', 'Chess', 'chess', 'Over-the-board chess competitions with published pairings and standings.', 'Individual', '["Swiss","Round robin","Single elimination"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000003', 'Tennis', 'tennis', 'Court tournaments for singles and doubles competition.', 'Singles and doubles', '["Single elimination","Round robin"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000004', 'Football', 'football', 'Grassroots and competitive football tournaments.', '5-a-side, 7-a-side, 11-a-side', '["Single elimination","Group stage"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000005', 'Table Tennis', 'table-tennis', 'Table tennis fixtures with official result recording.', 'Singles and doubles', '["Single elimination","Round robin"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000006', 'Badminton', 'badminton', 'Competitive badminton for singles and doubles.', 'Singles and doubles', '["Single elimination","Round robin"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000007', 'Basketball', 'basketball', 'Team basketball competitions with fixtures and standings.', '3x3 and 5x5', '["Single elimination","Group stage"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000008', 'Darts', 'darts', 'Darts fixtures with legs, sets, and knockout progression.', 'Individual', '["Single elimination","Round robin"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "supportedMode" = EXCLUDED."supportedMode",
  "formats" = EXCLUDED."formats",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
