--name: BenchmarksDashboard
--friendlyName: UA | Tests | Benchmarks
--connection: System:Datagrok
--input: int lastBuildsNum = 5
--input: bool showNotRun = false {optional: true}
--input: bool showBenchmarks = true {optional: true}
--input: bool showNotCiCd = false {optional: true}
WITH last_builds AS (
    select name, build_date
    from builds b
    -- todo: filter builds with cicd not-stresstest runs
    -- todo: filter only success builds
    where (SELECT count(*) from test_runs r where r.build_name = b.name and not r.stress_test and r.benchmark) > 10
    order by b.build_date desc limit @lastBuildsNum
), last_builds_indexed AS (
  select name, ROW_NUMBER() OVER (ORDER BY build_date) AS build_index,
         build_date
  from last_builds b
)
select
  b.name as build,
  b.build_index,
  b.build_date,
  t.name as test,
  t.type, 
  r.date_time,
  case when r.passed is null then 'did not run' when r.skipped then 'skipped' when r.passed then 'passed' when not r.passed then 'failed' else 'unknown' end as status,
  COALESCE(r.params->>'flaking', 'false')::bool as flaking, 
  r.result,
  r.duration,
  coalesce(nullif(t.owner, ''), p.package_author, '') as owner
from tests t full join last_builds_indexed b on 1=1
left join test_runs r on r.test_name = t.name and r.build_name = b.name and (t.first_run <= r.date_time or t.first_run is null) and
r.date_time = (select max(_r.date_time) from test_runs _r where _r.test_name = r.test_name and _r.build_name = r.build_name and not _r.stress_test) and not r.stress_test and (@showNotCiCd or r.ci_cd)
left join published_packages p on p.name = t.package and p.is_current
where   t.name not like '%Unhandled exceptions: Exception' and (not t.name = ': : ') and (@showNotRun or not r.passed is null) and r.benchmark = @showBenchmarks
order by b.name, t.name
--end