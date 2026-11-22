-- Test data setup untuk Phase 3 testing
-- Insert sample projects dan evidence

-- 1. Insert Project
INSERT INTO projects (
  id, project_id, customer, project_name, project_type, pic,
  start_date, deadline, target, target_unit,
  reported_actual, reported_progress_pct, reported_status,
  last_reported_update_at, created_at, updated_at
) VALUES (
  'proj-uuid-001', 'TEST_PROJ_001', 'Acme Corp', 'Website Redesign', 'Web',
  'John Smith', '2024-01-01', '2024-11-25', '100', 'pages',
  45, 45.0, 'ON_TRACK', '2024-11-20 10:00:00',
  now(), now()
);

-- 2. Insert Project Updates
INSERT INTO project_updates (
  id, project_id, update_id, timestamp, source_type, source_name, message, imported_at
) VALUES
(
  'update-uuid-001', 'proj-uuid-001', 'update_20241115_001', 
  '2024-11-15 09:00:00', 'EMAIL', 'John Smith',
  'Progress update: Completed design phase, starting development',
  now()
),
(
  'update-uuid-002', 'proj-uuid-001', 'update_20241120_001',
  '2024-11-20 10:00:00', 'DASHBOARD', 'Automated System',
  'Weekly status: 45% complete, on track for delivery',
  now()
);

-- 3. Insert Production Records
INSERT INTO production_records (
  id, project_id, source_record_id, generated_at, source_system,
  record_type, timestamp, payload, imported_at
) VALUES
(
  'record-uuid-001', 'proj-uuid-001', 'prod_deploy_001',
  '2024-11-20 14:00:00', 'JENKINS', 'DEPLOYMENT',
  '2024-11-20 14:00:00',
  '{"version":"2.1.0","environment":"staging","status":"success","duration_mins":15}'::jsonb,
  now()
),
(
  'record-uuid-002', 'proj-uuid-001', 'prod_perf_001',
  '2024-11-20 15:00:00', 'MONITORING', 'PERFORMANCE',
  '2024-11-20 15:00:00',
  '{"response_time_ms":145,"error_rate_pct":0.01,"uptime_pct":99.9,"throughput_rps":850}'::jsonb,
  now()
),
(
  'record-uuid-003', 'proj-uuid-001', 'prod_incident_001',
  '2024-11-18 11:00:00', 'JIRA', 'INCIDENT',
  '2024-11-18 11:00:00',
  '{"severity":"MEDIUM","status":"RESOLVED","resolution_time_mins":120,"component":"API Gateway"}'::jsonb,
  now()
);

-- Verify inserts
SELECT 'Projects' as entity, COUNT(*) as count FROM projects
UNION ALL
SELECT 'Updates', COUNT(*) FROM project_updates
UNION ALL
SELECT 'Records', COUNT(*) FROM production_records;
