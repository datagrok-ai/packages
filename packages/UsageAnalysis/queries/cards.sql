--name: UniqueUsersCount
--input: string date {pattern: datetime}
--input: list<string> groups
--input: list<string> packages
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
--test: UniqueUsersCount(date='today', ['1ab8b38d-9c4e-4b1e-81c3-ae2bde3e12c5'], ['all'])
with recursive selected_groups as (
  select id from groups
  where id = any(@groups)
  union
  select gr.child_id as id from selected_groups sg
  join groups_relations gr on sg.id = gr.parent_id
),
_dates as (
select min(event_time) as min_date, max(event_time) as max_date from events WHERE @date(event_time)
),
dates as (
select min_date - (max_date - min_date) as min_prev_date, min_date, max_date from _dates
),
res AS (
select u.id as uid, case when e.event_time < min_date then 1 else 2 end as period
from events e
inner join event_types et on e.event_type_id = et.id
left join entities en on et.id = en.id
left join published_packages pp on en.package_id = pp.id
left join event_parameter_values epv inner join event_parameters ep on epv.parameter_id = ep.id and ep.name = 'package'
on epv.event_id = e.id
left join published_packages pp1 on pp1.id = epv.value_uuid
left join event_parameter_values epv1 inner join event_parameters ep1 on epv1.parameter_id = ep1.id and ep1.type = 'entity_id'
inner join entities e1 on epv1.value != 'null' and e1.id = epv1.value_uuid
inner join published_packages pp2 inner join packages p2 on p2.id = pp2.package_id on e1.package_id = pp2.id
on epv1.event_id = e.id
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
inner join dates d on e.event_time between d.min_prev_date and d.max_date
inner join selected_groups sg on u.group_id = sg.id
where (coalesce(pp.name, pp1.name, pp2.name, 'Core') = any(@packages) or @packages = ARRAY['all'])
)
select (select count(distinct res.uid) as count1 from res where period = 1),
(select count(distinct res.uid) as count2 from res where period = 2)
--end


--name: NewUsersCount
--input: string date {pattern: datetime}
--input: list<string> groups
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
--test: NewUsersCount(date='today', ['1ab8b38d-9c4e-4b1e-81c3-ae2bde3e12c5'])
with recursive selected_groups as (
  select id from groups
  where id = any(@groups)
  union
  select gr.child_id as id from selected_groups sg
  join groups_relations gr on sg.id = gr.parent_id
),
_dates as (
select min(event_time) as min_date, max(event_time) as max_date from events WHERE @date(event_time)
),
dates as (
select min_date - (max_date - min_date) as min_prev_date, min_date, max_date from _dates
),
res AS (
select u.id as uid, case when u.joined < min_date then 1 else 2 end as period
from users u
inner join dates d on u.joined between d.min_prev_date and d.max_date
inner join selected_groups sg on u.group_id = sg.id
)
select (select count(distinct res.uid) as count1 from res where period = 1),
(select count(distinct res.uid) as count2 from res where period = 2)
--end


--name: SessionsCount
--input: string date {pattern: datetime}
--input: list<string> groups
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
--test: SessionsCount(date='today', ['1ab8b38d-9c4e-4b1e-81c3-ae2bde3e12c5'])
with recursive selected_groups as (
  select id from groups
  where id = any(@groups)
  union
  select gr.child_id as id from selected_groups sg
  join groups_relations gr on sg.id = gr.parent_id
),
_dates as (
select min(event_time) as min_date, max(event_time) as max_date from events WHERE @date(event_time)
),
dates as (
select min_date - (max_date - min_date) as min_prev_date, min_date, max_date from _dates
),
res AS (
select e.id as eid, case when e.event_time < min_date then 1 else 2 end as period
from events e
inner join event_types et on e.event_type_id = et.id
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
inner join dates d on e.event_time between d.min_prev_date and d.max_date
inner join selected_groups sg on u.group_id = sg.id
where et.friendly_name = 'datagrok-started'
)
select (select count(distinct res.eid) as count1 from res where period = 1),
(select count(distinct res.eid) as count2 from res where period = 2)
--end


--name: ViewsCount
--input: string date {pattern: datetime}
--input: list<string> groups
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
--test1: ViewsCount(date='today', ['1ab8b38d-9c4e-4b1e-81c3-ae2bde3e12c5'])
with recursive selected_groups as (
  select id from groups
  where id = any(@groups)
  union
  select gr.child_id as id from selected_groups sg
  join groups_relations gr on sg.id = gr.parent_id
),
_dates as (
select min(event_time) as min_date, max(event_time) as max_date from events WHERE @date(event_time)
),
dates as (
select min_date - (max_date - min_date) as min_prev_date, min_date, max_date from _dates
),
res AS (
select q.id as qid, case when q.created_on < min_date then 1 else 2 end as period
from view_layouts q
inner join users u on u.id = q.author_id
inner join dates d on q.created_on between d.min_prev_date and d.max_date
inner join selected_groups sg on u.group_id = sg.id
)
select (select count(distinct res.qid) as count1 from res where period = 1),
(select count(distinct res.qid) as count2 from res where period = 2)
--end


--name: ConnectionsCount
--input: string date {pattern: datetime}
--input: list<string> groups
--input: list<string> packages
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
--test: ConnectionsCount(date='today', ['1ab8b38d-9c4e-4b1e-81c3-ae2bde3e12c5'], ['all'])
with recursive selected_groups as (
  select id from groups
  where id = any(@groups)
  union
  select gr.child_id as id from selected_groups sg
  join groups_relations gr on sg.id = gr.parent_id
),
_dates as (
select min(event_time) as min_date, max(event_time) as max_date from events WHERE @date(event_time)
),
dates as (
select min_date - (max_date - min_date) as min_prev_date, min_date, max_date from _dates
),
res AS (
select c.id as cid, case when c.created_on < min_date then 1 else 2 end as period
from connections c
inner join entities en on en.id = c.id
left join published_packages pp ON pp.id = en.package_id
inner join users u on u.id = c.author_id
inner join dates d on c.created_on between d.min_prev_date and d.max_date
inner join selected_groups sg on u.group_id = sg.id
where en.is_deleted = false
and (coalesce(pp.name, 'Core') = any(@packages) or @packages = ARRAY['all'])
)
select (select count(distinct res.cid) as count1 from res where period = 1),
(select count(distinct res.cid) as count2 from res where period = 2)
--end


--name: QueriesCount
--input: string date {pattern: datetime}
--input: list<string> groups
--input: list<string> packages
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
--test: QueriesCount(date='today', ['1ab8b38d-9c4e-4b1e-81c3-ae2bde3e12c5'], ['all'])
with recursive selected_groups as (
  select id from groups
  where id = any(@groups)
  union
  select gr.child_id as id from selected_groups sg
  join groups_relations gr on sg.id = gr.parent_id
),
_dates as (
select min(event_time) as min_date, max(event_time) as max_date from events WHERE @date(event_time)
),
dates as (
select min_date - (max_date - min_date) as min_prev_date, min_date, max_date from _dates
),
res AS (
select q.id as qid, case when q.created_on < min_date then 1 else 2 end as period
from queries q
inner join entities en on en.id = q.id
left join published_packages pp ON pp.id = en.package_id
inner join users u on u.id = q.author_id
inner join dates d on q.created_on between d.min_prev_date and d.max_date
inner join selected_groups sg on u.group_id = sg.id
where en.is_deleted = false
and (coalesce(pp.name, 'Core') = any(@packages) or @packages = ARRAY['all'])
)
select (select count(distinct res.qid) as count1 from res where period = 1),
(select count(distinct res.qid) as count2 from res where period = 2)
--end

--name: TestsCount
--meta.cache: all
--input: datetime date
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
    with res as (select
distinct on (e.description, date)
e.event_time::date as date,
case when v4.value::bool then 'skipped' when v1.value::bool then 'passed' else 'failed' end as status
from events e
inner join event_types t on t.id = e.event_type_id and t.source = 'usage' and t.friendly_name like 'test-%'
left join event_parameter_values v1 inner join event_parameters p1 on p1.id = v1.parameter_id and p1.name = 'success' on v1.event_id = e.id
left join event_parameter_values v4 inner join event_parameters p4 on p4.id = v4.parameter_id and p4.name = 'skipped' on v4.event_id = e.id
where e.event_time::date BETWEEN @date::date - 1 and @date::date
order by e.description, date, e.event_time desc
),
filled as (select res.date,
count(*) filter (where status = 'passed') as passed,
count(*) filter (where status = 'failed') as failed,
count(*) filter (where status = 'skipped') as skipped
from res
group by date),
empty as (select generate_series(
	@date::date - 1,
	@date::date,
	interval '1 day'
)::date AS date, 0 as passed, 0 as failed, 0 as skipped)
select e.date,
       COALESCE(f.passed, e.passed) as passed,
       COALESCE(f.failed, e.failed) as failed,
       COALESCE(f.skipped, e.skipped) as skipped
from empty e
         left join filled f on f.date = e.date
--end
