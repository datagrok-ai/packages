--name: LatestScenarioResults
--connection: System:Datagrok
select
t.id::text as id,
v5.value as type,
v7.value as test,
v8.value as category,
e.description as name,
e.event_time as date,
case when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else 'failed' end as status,
v2.value as result,
v3.value::int as ms,
v6.value as package
from events e
inner join event_types t on t.id = e.event_type_id and t.source = 'usage' and t.friendly_name like 'test-%'
left join event_parameter_values v1 inner join event_parameters p1 on p1.id = v1.parameter_id and p1.name = 'success' on v1.event_id = e.id
left join event_parameter_values v2 inner join event_parameters p2 on p2.id = v2.parameter_id and p2.name = 'result' on v2.event_id = e.id
left join event_parameter_values v3 inner join event_parameters p3 on p3.id = v3.parameter_id and p3.name = 'ms' on v3.event_id = e.id
left join event_parameter_values v4 inner join event_parameters p4 on p4.id = v4.parameter_id and p4.name = 'skipped' on v4.event_id = e.id
inner join event_parameter_values v5 inner join event_parameters p5 on p5.id = v5.parameter_id and p5.name = 'type' on v5.event_id = e.id
left join event_parameter_values v6 inner join event_parameters p6 on p6.id = v6.parameter_id and p6.name = 'packageName' on v6.event_id = e.id
left join event_parameter_values v7 inner join event_parameters p7 on p7.id = v7.parameter_id and p7.name = 'test' on v7.event_id = e.id
left join event_parameter_values v8 inner join event_parameters p8 on p8.id = v8.parameter_id and p8.name = 'category' on v8.event_id = e.id
where
e.event_time = (select max(_e.event_time) from events _e where _e.event_type_id = e.event_type_id)
--end

--name: ScenarioHistory
--connection: System:Datagrok
--input: string id
select
e.id, e.event_time as date,
case when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else 'failed' end as status,
v3.value::int as ms,
v2.value as result, u.id as uid,
p5.name as res_name, v5.value as res_value
from events e
inner join event_types t on t.id = e.event_type_id and t.source = 'usage' and t.friendly_name like 'test-%'
left join event_parameter_values v1 inner join event_parameters p1 on p1.id = v1.parameter_id and p1.name = 'success' on v1.event_id = e.id
left join event_parameter_values v2 inner join event_parameters p2 on p2.id = v2.parameter_id and p2.name = 'result' on v2.event_id = e.id
left join event_parameter_values v3 inner join event_parameters p3 on p3.id = v3.parameter_id and p3.name = 'ms' on v3.event_id = e.id
left join event_parameter_values v4 inner join event_parameters p4 on p4.id = v4.parameter_id and p4.name = 'skipped' on v4.event_id = e.id
left join event_parameter_values v5 inner join event_parameters p5 on p5.id = v5.parameter_id and p5.name like 'result.%' on v5.event_id = e.id
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where
e.event_type_id = @id
order by e.event_time desc
--end

--name: TestsToday
--input: datetime date
--connection: System:Datagrok
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
select
distinct on (e.description)
t.id::text as id,
v6.value as package,
v7.value as test,
v8.value as category,
case when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else 'failed' end as status,
v2.value as result,
case when v3.value != 'null' then v3.value::int else null end as ms,
e.event_time as date,
v5.value as type,
v9.value as version
from events e
inner join event_types t on t.id = e.event_type_id and t.source = 'usage' and t.friendly_name like 'test-%'
left join event_parameter_values v1 inner join event_parameters p1 on p1.id = v1.parameter_id and p1.name = 'success' on v1.event_id = e.id
left join event_parameter_values v2 inner join event_parameters p2 on p2.id = v2.parameter_id and p2.name = 'result' on v2.event_id = e.id
left join event_parameter_values v3 inner join event_parameters p3 on p3.id = v3.parameter_id and p3.name = 'ms' on v3.event_id = e.id
left join event_parameter_values v4 inner join event_parameters p4 on p4.id = v4.parameter_id and p4.name = 'skipped' on v4.event_id = e.id
inner join event_parameter_values v5 inner join event_parameters p5 on p5.id = v5.parameter_id and p5.name = 'type' on v5.event_id = e.id
left join event_parameter_values v6 inner join event_parameters p6 on p6.id = v6.parameter_id and p6.name = 'packageName' on v6.event_id = e.id
left join event_parameter_values v7 inner join event_parameters p7 on p7.id = v7.parameter_id and p7.name = 'test' on v7.event_id = e.id
left join event_parameter_values v8 inner join event_parameters p8 on p8.id = v8.parameter_id and p8.name = 'category' on v8.event_id = e.id
left join event_parameter_values v9 inner join event_parameters p9 on p9.id = v9.parameter_id and p9.name = 'version' on v9.event_id = e.id
where e.event_time::date = @date
order by e.description, e.event_time desc
--end

--name: TestsMonth
--connection: System:Datagrok
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
with ress as (select
e.description, e.event_time,
e.event_time::date as date,
case when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else 'failed' end as status
from events e
inner join event_types t on t.id = e.event_type_id and t.source = 'usage' and t.friendly_name like 'test-%'
left join event_parameter_values v1 inner join event_parameters p1 on p1.id = v1.parameter_id and p1.name = 'success' on v1.event_id = e.id
left join event_parameter_values v4 inner join event_parameters p4 on p4.id = v4.parameter_id and p4.name = 'skipped' on v4.event_id = e.id
where e.event_time::date BETWEEN now()::date - 30 and now()::date
),
res as (select
distinct on (ress.description, ress.date) ress.date, ress.status
from ress
ORDER by ress.description, ress.date, ress.event_time desc
),
filled as (select *, count(*)
from res
group by date, status
),
dates as (select generate_series(
	now()::date - 30,
	now()::date,
	interval '1 day'
)::date AS date),
all_statuses AS (
	SELECT unnest(ARRAY['failed', 'passed', 'skipped']) AS status
),
empty as (select *, 0 as count
from dates
cross join all_statuses)
select e.date, e.status, COALESCE(f.count, e.count) as count
from empty e
left join filled f on f.date = e.date and f.status = e.status
--end

--name: TestTrack
--connection: System:Datagrok
--input: string version
--input: string uid
--input: string start
select
distinct on (e.description)
e.description as path,
case when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else 'failed' end as status,
v2.value as reason,
e.event_time as date
from events e
inner join event_types t on t.id = e.event_type_id and t.source = 'usage' and t.friendly_name like 'test-manual%'
left join event_parameter_values v1 inner join event_parameters p1 on p1.id = v1.parameter_id and p1.name = 'success' on v1.event_id = e.id
left join event_parameter_values v2 inner join event_parameters p2 on p2.id = v2.parameter_id and p2.name = 'result' on v2.event_id = e.id
left join event_parameter_values v3 inner join event_parameters p3 on p3.id = v3.parameter_id and p3.name = 'version' on v3.event_id = e.id
left join event_parameter_values v4 inner join event_parameters p4 on p4.id = v4.parameter_id and p4.name = 'skipped' on v4.event_id = e.id
left join event_parameter_values v5 inner join event_parameters p5 on p5.id = v5.parameter_id and p5.name = 'uid' on v5.event_id = e.id
left join event_parameter_values v6 inner join event_parameters p6 on p6.id = v6.parameter_id and p6.name = 'start' on v6.event_id = e.id
where v3.value = @version and v5.value = @uid and v6.value = @start
order by e.description, e.event_time desc
--end

--name: LastStatuses
--connection: System:Datagrok
--input: string path
select
case when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else 'failed' end as status,
e.event_time as date,
v5.value::uuid as uid,
v3.value as version,
v2.value as reason,
v6.value as start
from events e
inner join event_types t on t.id = e.event_type_id and t.source = 'usage' and t.friendly_name like 'test-manual%'
left join event_parameter_values v1 inner join event_parameters p1 on p1.id = v1.parameter_id and p1.name = 'success' on v1.event_id = e.id
left join event_parameter_values v2 inner join event_parameters p2 on p2.id = v2.parameter_id and p2.name = 'result' on v2.event_id = e.id
left join event_parameter_values v3 inner join event_parameters p3 on p3.id = v3.parameter_id and p3.name = 'version' on v3.event_id = e.id
left join event_parameter_values v4 inner join event_parameters p4 on p4.id = v4.parameter_id and p4.name = 'skipped' on v4.event_id = e.id
left join event_parameter_values v5 inner join event_parameters p5 on p5.id = v5.parameter_id and p5.name = 'uid' on v5.event_id = e.id
left join event_parameter_values v6 inner join event_parameters p6 on p6.id = v6.parameter_id and p6.name = 'start' on v6.event_id = e.id
where e.description = @path
order by e.event_time desc
limit 4
--end

--name: TestingName
--connection: System:Datagrok
--input: string id
--output: string name
select
distinct on (e.description)
v1.value as name
from events e
inner join event_types t on t.id = e.event_type_id and t.source = 'usage' and t.friendly_name = 'tt-new-testing'
left join event_parameter_values v1 inner join event_parameters p1 on p1.id = v1.parameter_id and p1.name = 'name' on v1.event_id = e.id
where e.description = @id
order by e.description, e.event_time desc
--end

--name: getServerStartsFor2Weeks
--connection: System:Datagrok
--meta.cache: all
--input: datetime date
--meta.cache.invalidateOn: 0 0 * * *
select
distinct on (a.commit) a.id, a.buildtime, a.commit
from (select
e.id, e.description, e.event_time as buildtime, v2.value as commit
from events e
inner join event_parameter_values v2 inner join event_parameters p2 on (p2.id = v2.parameter_id and p2.name = 'commit')  on v2.event_id = e.id
where e.description like '%Datagrok server started%' and e.event_time::date BETWEEN now()::date - 14 and now()::date
order by e.event_time) a
--end

--name: getTestStatusesInTimespan
--connection: System:Datagrok 
--meta.cache: all
--input: datetime startDate 
--input: datetime endDate 
--input: dataframe testslist 
--meta.cache.invalidateOn: 0 0 * * *
select DISTINCT ON (e.event_time::date,   eventnames.eventname) e.event_time::date as date,   eventnames.eventname as description,
case when e.event_time IS NULL then 'did not run' when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else  'failed' end as status
from(SELECT DISTINCT ON (COALESCE(d.description, df.name)) COALESCE(d.description, df.name) as eventname
FROM events d 
inner join event_types t on t.id = d.event_type_id and t.source = 'usage' and t.friendly_name like 'test-%'
FULL OUTER JOIN testslist df ON df.name = d.description) eventnames
left join events e on e.description = eventnames.eventname and (e.event_time::date  BETWEEN @startDate:date::date and (@endDate:date::date))
left join event_parameter_values v1 inner join event_parameters p1 on p1.id = v1.parameter_id and p1.name = 'success' on v1.event_id = e.id
left join event_parameter_values v4 inner join event_parameters p4 on p4.id = v4.parameter_id and p4.name = 'skipped' on v4.event_id = e.id 
ORDER BY eventnames.eventname;
--end

--name: Builds
--connection: System:Datagrok
with commits as (
select distinct on (a.commit) a.id, a.buildtime, a.commit
from (select
e.id, e.description, e.event_time as buildtime, v2.value as commit
from events e
inner join event_types t on t.id = e.event_type_id
inner join event_parameter_values v2 inner join event_parameters p2 on (p2.id = v2.parameter_id and p2.name = 'commit')  on v2.event_id = e.id
where t.friendly_name = 'datagrok-started' and t.source = 'info' and NOT e.id = 'e1c09320-25d0-11ef-abf5-c1c6c1b45111'
order by e.event_time) a)
select buildtime || ' - ' || commit as text, buildtime as build, commits.id as id,
coalesce((select min(c2.buildtime) from commits c2 where c2.buildtime > commits.buildtime), now() at time zone 'utc') as next from commits order by 1 desc
--end

--name: BuildTestsData
--connection: System:Datagrok
--meta.cache: all
--meta.cache.invalidateOn: * /10 * * * *
--input: datetime dateStart
--input: datetime dateEnd
select DISTINCT ON (t.friendly_name) t.friendly_name as description,
case when e.event_time IS NULL then 'did not run' when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else  'failed' end as status
from
event_types t
left join events e on e.event_type_id = t.id and (e.event_time  BETWEEN @dateStart and @dateEnd)
left join event_parameter_values v1 inner join event_parameters p1 on p1.id = v1.parameter_id and p1.name = 'success' on v1.event_id = e.id
left join event_parameter_values v4 inner join event_parameters p4 on p4.id = v4.parameter_id and p4.name = 'skipped' on v4.event_id = e.id
where t.source = 'usage' and t.friendly_name like 'test-%'
ORDER BY t.friendly_name, e.event_time desc;
--end

--name: getTestsInBuildsTimespan
--connection: System:Datagrok 
--meta.cache: all
--input: datetime dateStart
--input: datetime dateEnd
--input: dataframe testslist
--meta.cache.invalidateOn: 0 0 * * *
with commits as (
select distinct on (a.commit) a.id, a.buildtime, a.commit
from (select
e.id, e.description, e.event_time as buildtime, v2.value as commit
from events e
inner join event_types t on t.id = e.event_type_id
inner join event_parameter_values v2 inner join event_parameters p2 on (p2.id = v2.parameter_id and p2.name = 'commit')  on v2.event_id = e.id
where t.friendly_name = 'datagrok-started' and t.source = 'info' and NOT e.id = 'e1c09320-25d0-11ef-abf5-c1c6c1b45111'and (e.event_time  BETWEEN @dateStart and @dateEnd)
order by e.event_time) a), 
builds as (select buildtime || ' - ' || commit as build, buildtime as date,
coalesce((select min(c2.buildtime) from commits c2 where c2.buildtime > commits.buildtime), now() at time zone 'utc') as next from commits order by 1 desc
), types as
(select t.id, COALESCE(t.friendly_name, df.name) as friendly_name, regexp_matches(COALESCE(t.friendly_name, df.name), 'test-(\S*) (\S[^:]*): (.*): (.*)')as data
from event_types t
full outer join testslist df on df.name =  t.friendly_name
where ((t.friendly_name like 'test-%' and t.source = 'usage') or  df.name like 'test-%'))

select DISTINCT ON (b.build, t.friendly_name) b.date as build_date, b.build, 
t.id::text as test_id,
e.event_time as test_time,
coalesce(v6.value, t.data[2]) as package,
coalesce(v7.value, t.data[4]) as test,
coalesce(v8.value, t.data[3]) as category,
case when e.id is null then 'did not run' when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else 'failed' end as status,
v2.value as result,
case when v3.value != 'null' then v3.value::int else null end as ms,
coalesce(v5.value, t.data[1]) as type
from
types t
left join event_parameters p1 on p1.event_type_id = t.id and p1.name = 'success'
left join event_parameters p2 on p2.event_type_id = t.id and p2.name = 'result'
left join event_parameters p3 on p3.event_type_id = t.id and p3.name = 'ms'
left join event_parameters p4 on p4.event_type_id = t.id and p4.name = 'skipped'
left join event_parameters p5 on p5.event_type_id = t.id and p5.name = 'type'
left join event_parameters p6 on p6.event_type_id = t.id and p6.name = 'packageName'
left join event_parameters p7 on p7.event_type_id = t.id and p7.name = 'test'
left join event_parameters p8 on p8.event_type_id = t.id and p8.name = 'category'
full join builds b on 1=1
left join events e on e.event_type_id = t.id and (e.event_time  BETWEEN b.date and b.next)
left join event_parameter_values v1  on v1.event_id = e.id and p1.id = v1.parameter_id
left join event_parameter_values v2  on v2.event_id = e.id and p2.id = v2.parameter_id
left join event_parameter_values v3  on v3.event_id = e.id and p3.id = v3.parameter_id
left join event_parameter_values v4  on v4.event_id = e.id and p4.id = v4.parameter_id
left join event_parameter_values v5  on v5.event_id = e.id and p5.id = v5.parameter_id
left join event_parameter_values v6  on v6.event_id = e.id and p6.id = v6.parameter_id
left join event_parameter_values v7 on v7.event_id = e.id and p7.id = v7.parameter_id
left join event_parameter_values v8  on v8.event_id = e.id and p8.id = v8.parameter_id

ORDER BY b.build desc, t.friendly_name
--end


--name: getTestStatusesByBuildId
--connection: System:Datagrok 
--meta.cache: all
--input: string buildId 
--input: dataframe testslist 
--meta.cache.invalidateOn: 0 0 * * *
with commits as (
select distinct on (a.commit) a.id, a.buildtime, a.commit
from (select
e.id, e.description, e.event_time as buildtime, v2.value as commit
from events e
inner join event_types t on t.id = e.event_type_id
inner join event_parameter_values v2 inner join event_parameters p2 on (p2.id = v2.parameter_id and p2.name = 'commit')  on v2.event_id = e.id
where t.friendly_name = 'datagrok-started' and t.source = 'info' and NOT e.id = 'e1c09320-25d0-11ef-abf5-c1c6c1b45111' 	
order by e.event_time) a), 
builds as (select buildtime || ' - ' || commit as build, buildtime as date,
coalesce((select min(c2.buildtime) from commits c2 where c2.buildtime > commits.buildtime), now() at time zone 'utc') as next from commits
where id = @buildId order by 1 desc
), types as
(select t.id, COALESCE(t.friendly_name, df.name) as friendly_name, regexp_matches(COALESCE(t.friendly_name, df.name), 'test-(\S*) (\S[^:]*): (.*): (.*)')as data
from event_types t
full outer join testslist df on df.name =  t.friendly_name
where ((t.friendly_name like 'test-%' and t.source = 'usage') or  df.name like 'test-%'))

select DISTINCT ON (b.build, t.friendly_name) b.date as build_date, b.build, 
t.id::text as test_id,
e.event_time as test_time,
coalesce(v6.value, t.data[2]) as package,
coalesce(v7.value, t.data[4]) as test,
coalesce(v8.value, t.data[3]) as category,
case when e.id is null then 'did not run' when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else 'failed' end as status,
v2.value as result,
case when v3.value != 'null' then v3.value::int else null end as ms,
coalesce(v5.value, t.data[1]) as type
from
types t
left join event_parameters p1 on p1.event_type_id = t.id and p1.name = 'success'
left join event_parameters p2 on p2.event_type_id = t.id and p2.name = 'result'
left join event_parameters p3 on p3.event_type_id = t.id and p3.name = 'ms'
left join event_parameters p4 on p4.event_type_id = t.id and p4.name = 'skipped'
left join event_parameters p5 on p5.event_type_id = t.id and p5.name = 'type'
left join event_parameters p6 on p6.event_type_id = t.id and p6.name = 'packageName'
left join event_parameters p7 on p7.event_type_id = t.id and p7.name = 'test'
left join event_parameters p8 on p8.event_type_id = t.id and p8.name = 'category'
full join builds b on 1=1
left join events e on e.event_type_id = t.id and (e.event_time  BETWEEN b.date and b.next)
left join event_parameter_values v1  on v1.event_id = e.id and p1.id = v1.parameter_id
left join event_parameter_values v2  on v2.event_id = e.id and p2.id = v2.parameter_id
left join event_parameter_values v3  on v3.event_id = e.id and p3.id = v3.parameter_id
left join event_parameter_values v4  on v4.event_id = e.id and p4.id = v4.parameter_id
left join event_parameter_values v5  on v5.event_id = e.id and p5.id = v5.parameter_id
left join event_parameter_values v6  on v6.event_id = e.id and p6.id = v6.parameter_id
left join event_parameter_values v7 on v7.event_id = e.id and p7.id = v7.parameter_id
left join event_parameter_values v8  on v8.event_id = e.id and p8.id = v8.parameter_id

ORDER BY b.build desc, t.friendly_name
--end

--name: getTestStatusesAcordingDF
--connection: System:Datagrok 
--meta.cache: all
--input: string buildId 
--input: dataframe testslist 
--meta.cache.invalidateOn: 0 0 * * *

  with commits as (
  select distinct on (a.commit) a.id, a.buildtime, a.commit
  from (select
  e.id, e.description, e.event_time as buildtime, v2.value as commit
  from events e
  inner join event_types t on t.id = e.event_type_id
  inner join event_parameter_values v2 inner join event_parameters p2 on (p2.id = v2.parameter_id and p2.name = 'commit')  on v2.event_id = e.id
  where t.friendly_name = 'datagrok-started' and t.source = 'info' and NOT e.id = 'e1c09320-25d0-11ef-abf5-c1c6c1b45111' 
  order by e.event_time) a), 
  builds as (select buildtime || ' - ' || commit as build, buildtime as date,
  coalesce((select min(c2.buildtime) from commits c2 where c2.buildtime > commits.buildtime), now() at time zone 'utc') as next from commits 
  where id = @buildId order by 1 desc), 
  
  test_event_types as (select t.id, coalesce(t.friendly_name, df.name)as friendly_name from  event_types t
  full outer join testslist df on df.name =  t.friendly_name
  where ((t.friendly_name like 'test-integration%' or t.friendly_name like 'test-unit%') and t.source = 'usage') or df.name like 'test-%'),
  
  manualTestsTypes as (select t.id, t.friendly_name as friendly_name, regexp_matches(t.friendly_name, 'test-(\S*) (\S[^: ]*).* (\w+)')as data
  from test_event_types t
  where t.friendly_name like 'test-manual%'),
  autoTestsTypes as (select t.id, t.friendly_name as friendly_name, regexp_matches(t.friendly_name, 'test-(\S*) (\S[^:]*): (.*): (.*)')as data
  from test_event_types t),
  types as (select manualTestsTypes.id, manualTestsTypes.friendly_name as friendly_name, 
  manualTestsTypes.data[1] as type, 
  null as package,
  manualTestsTypes.data[3] as test,
  manualTestsTypes.data[2] as category
  from manualTestsTypes
  union 
  select autoTestsTypes.id, autoTestsTypes.friendly_name as friendly_name, 
  autoTestsTypes.data[1] as type, 
  autoTestsTypes.data[2] as package,
  autoTestsTypes.data[4] as test,
  autoTestsTypes.data[3] as category
  from autoTestsTypes)



select DISTINCT ON (b.build, t.friendly_name) b.date as build_date, b.build, 
t.id::text as test_id,
e.event_time as test_time,
coalesce(v6.value, t.package) as package,
coalesce(v7.value, t.test) as test,
coalesce(v8.value, t.category) as category,
case when e.id is null then 'did not run' when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else 'failed' end as status,
v2.value as result,
case when v3.value != 'null' then v3.value::int else null end as ms,
coalesce(v5.value, t.type) as type
from
types t
left join event_parameters p1 on p1.event_type_id = t.id and p1.name = 'success'
left join event_parameters p2 on p2.event_type_id = t.id and p2.name = 'result'
left join event_parameters p3 on p3.event_type_id = t.id and p3.name = 'ms'
left join event_parameters p4 on p4.event_type_id = t.id and p4.name = 'skipped'
left join event_parameters p5 on p5.event_type_id = t.id and p5.name = 'type'
left join event_parameters p6 on p6.event_type_id = t.id and p6.name = 'packageName'
left join event_parameters p7 on p7.event_type_id = t.id and p7.name = 'test'
left join event_parameters p8 on p8.event_type_id = t.id and p8.name = 'category'
full join builds b on 1=1
left join events e on e.event_type_id = t.id and (e.event_time  BETWEEN b.date and b.next)
left join event_parameter_values v1  on v1.event_id = e.id and p1.id = v1.parameter_id
left join event_parameter_values v2  on v2.event_id = e.id and p2.id = v2.parameter_id
left join event_parameter_values v3  on v3.event_id = e.id and p3.id = v3.parameter_id
left join event_parameter_values v4  on v4.event_id = e.id and p4.id = v4.parameter_id
left join event_parameter_values v5  on v5.event_id = e.id and p5.id = v5.parameter_id
left join event_parameter_values v6  on v6.event_id = e.id and p6.id = v6.parameter_id
left join event_parameter_values v7 on v7.event_id = e.id and p7.id = v7.parameter_id
left join event_parameter_values v8  on v8.event_id = e.id and p8.id = v8.parameter_id

ORDER BY b.build desc, t.friendly_name
--end 