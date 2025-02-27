--name: StressTestsDashboard
--friendlyName: UA | Tests | Stress Tests Dashboard
--connection: System:Datagrok
--input: int lastBuildsNum = 3
WITH last_builds AS (
    select name, build_date
    from builds b
    where EXISTS(SELECT 1 from test_runs r where r.build_name = b.name and r.stress_test)
    order by b.build_date desc limit @lastBuildsNum
    ), last_builds_indexed AS (
select name, ROW_NUMBER() OVER (ORDER BY build_date) AS build_index,
    build_date
from last_builds b
    )
select
    case r.params ->> 'backup_size' when 'small' then 'S' when 'medium' then 'M' else 'L' end as backup,
    r.params ->> 'worker' as worker,
    r.params ->> 'browser' as browser,
    t.name as test,
    r.passed as passed,
    r.duration,
    r.date_time as started,
    r.batch_name as batch,
    r.params ->> 'category' as category,
    t.package
from tests t full join last_builds_indexed b on true
    inner join test_runs r on r.test_name = t.name and r.build_name = b.name and not r.skipped and r.stress_test and (t.first_run <= r.date_time or t.first_run is null)
    left join published_packages p on p.name = t.package and p.is_current
where t.name not like '%Unhandled exceptions: Exception' and t.name != ': : '
order by batch desc, backup, test, worker
--end
