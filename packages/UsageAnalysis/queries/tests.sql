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
--meta.cache1: all
--meta.invalidateOn1: 0 0 0 * *
select
distinct on (e.description)
t.id::text as id,
v6.value as package,
v7.value as test,
v8.value as category,
case when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else 'failed' end as status,
v2.value as result,
v3.value::int as ms,
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
--meta.cache1: all
--meta.invalidateOn1: 0 0 0 * *
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
v2.value as reason
from events e
inner join event_types t on t.id = e.event_type_id and t.source = 'usage' and t.friendly_name like 'test-manual%'
left join event_parameter_values v1 inner join event_parameters p1 on p1.id = v1.parameter_id and p1.name = 'success' on v1.event_id = e.id
left join event_parameter_values v2 inner join event_parameters p2 on p2.id = v2.parameter_id and p2.name = 'result' on v2.event_id = e.id
left join event_parameter_values v3 inner join event_parameters p3 on p3.id = v3.parameter_id and p3.name = 'version' on v3.event_id = e.id
left join event_parameter_values v4 inner join event_parameters p4 on p4.id = v4.parameter_id and p4.name = 'skipped' on v4.event_id = e.id
left join event_parameter_values v5 inner join event_parameters p5 on p5.id = v5.parameter_id and p5.name = 'uid' on v5.event_id = e.id
where e.description = @path
order by e.event_time desc
limit 3
--end