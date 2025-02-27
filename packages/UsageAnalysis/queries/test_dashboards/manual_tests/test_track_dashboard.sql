--name: Manual Tests
--friendlyName: UA | Tests | Manual Tests
--connection: System:Datagrok
--input: int lastBatchesNum = 5

WITH recent_batches AS (
  SELECT DISTINCT batch_name, MAX(date_time) as latest_batch_run
  FROM test_runs r
  JOIN tests t ON t.name = r.test_name
  WHERE t.type = 'manual'
  GROUP BY batch_name
  ORDER BY latest_batch_run DESC
  LIMIT @lastBatchesNum
), recent_batches_indexed AS (
  SELECT 
  batch_name,
  ROW_NUMBER() OVER (ORDER BY latest_batch_run DESC) AS batch_index,
  latest_batch_run
  FROM recent_batches
)
SELECT 
  rb.batch_name,
  rb.batch_index,
  t.name as test,
  t.type,
  r.build_name as build,
  r.date_time,
  CASE 
    WHEN r.passed IS NULL THEN 'did not run'
    WHEN r.skipped THEN 'skipped'
    WHEN r.passed THEN 'passed'
    WHEN NOT r.passed THEN 'failed'
    ELSE 'unknown'
  END as status,
  r.result
FROM tests t 
FULL JOIN recent_batches_indexed rb ON 1=1
LEFT JOIN test_runs r ON r.test_name = t.name 
  AND r.batch_name = rb.batch_name
  AND r.date_time = (
    SELECT MAX(_r.date_time) 
    FROM test_runs _r 
    WHERE _r.test_name = r.test_name 
    AND _r.batch_name = r.batch_name
  )
WHERE 1=1
  AND t.type = 'manual'
  AND r.passed IS NOT NULL
  AND t.name NOT LIKE '%Unhandled exceptions: Exception'
  AND (NOT t.name = ': : ')
ORDER BY rb.batch_name, t.name
--end