--name: All Test Runs
--connection: System:Datagrok
--input: string build_name {choices:  Query("select name  from builds order by build_date desc fetch first 10 rows only")}
--input: bool benchmarks = false
select distinct on (b.name, t.name) 
  b.name as build, 
  t.name as test, 
  t.type, 
  t.package, 
  r.date_time,
  case when r.passed is null then 'did not run' when r.skipped then 'skipped' when r.passed then 'passed' when not r.passed then 'failed' else 'unknown' end as status,
  r.result, 
  r.duration, 
  r.benchmark
from tests t full join builds b on 1 = 1
left join test_runs r on r.test_name = t.name and r.build_name = b.name and r.build_name = @build_name
where benchmark = @benchmarks or not @benchmarks 
order by b.name desc, t.name, r.date_time desc