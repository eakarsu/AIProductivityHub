CREATE TABLE IF NOT EXISTS engineering_velocity_records (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL CHECK (feature_key IN ('engineering-productivity','organizational-velocity')),
  team_name TEXT NOT NULL,
  delivery_stream TEXT NOT NULL,
  period TEXT NOT NULL,
  ai_assisted_work_pct NUMERIC(5,2) NOT NULL,
  cycle_time_hours NUMERIC(10,2) NOT NULL,
  rework_pct NUMERIC(5,2) NOT NULL,
  escaped_defects INTEGER NOT NULL,
  ai_cost_usd NUMERIC(12,2) NOT NULL,
  value_delivered_usd NUMERIC(14,2) NOT NULL,
  human_review_coverage_pct NUMERIC(5,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('baseline','improving','at_risk','verified')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(feature_key,team_name,period)
);

WITH seeds(feature_key,team_prefix,stream_prefix) AS (
  VALUES
    ('engineering-productivity','Engineering Pod','Product delivery'),
    ('organizational-velocity','Operating Unit','Cross-functional initiative')
)
INSERT INTO engineering_velocity_records
  (feature_key,team_name,delivery_stream,period,ai_assisted_work_pct,cycle_time_hours,rework_pct,escaped_defects,ai_cost_usd,value_delivered_usd,human_review_coverage_pct,status,evidence)
SELECT s.feature_key,s.team_prefix || ' ' || ((g-1)%5+1),s.stream_prefix || ' ' || LPAD(g::text,2,'0'),
  '2026-W' || LPAD((20+g)::text,2,'0'),35+g*3,96-g*3,18-(g%7),g%5,420+g*85,9500+g*2100,
  76+(g%6)*4,(ARRAY['baseline','improving','at_risk','verified'])[((g-1)%4)+1],
  jsonb_build_object(
    'pullRequests',12+g*2,'leadTimeBeforeAiHours',120+g*2,'leadTimeAfterAiHours',96-g*3,
    'reviewPolicy','AI drafts require accountable human review','qualitySignal','Production defect and rework evidence linked')
FROM seeds s CROSS JOIN generate_series(1,15) g
ON CONFLICT(feature_key,team_name,period) DO NOTHING;
