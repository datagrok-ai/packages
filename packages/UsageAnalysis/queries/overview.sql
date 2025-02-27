--name:UniqueUsersOverview
--input: string date {pattern: datetime}
--input: list<string> groups
--input: list<string> packages
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
with recursive selected_groups as (
  select id from groups
  where id = any(@groups)
  union
  select gr.child_id as id from selected_groups sg
  join groups_relations gr on sg.id = gr.parent_id
),
res AS (
select e.event_time as time_old, u.group_id as ugid,
coalesce(pp.name, pp1.name, pp2.name) as package, coalesce(pp.package_id, pp1.package_id, pp2.package_id) as pid
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
WHERE @date(e.event_time)
),
t1 AS (
  SELECT (MAX(res.time_old) - MIN(res.time_old)) as inter
  FROM res
),
t2 AS (
  SELECT case when inter >= INTERVAL '6 month' then 604800
  when inter >= INTERVAL '70 day' then 172800
	when inter >= INTERVAL '10 day' then 43200
	when inter >= INTERVAL '2 day' then 14400
	when inter >= INTERVAL '3 hour' then 1800
	else 600 end as trunc
from t1
)
select to_timestamp(floor((extract('epoch' from res.time_old) / trunc )) * trunc)
AT TIME ZONE 'UTC' as date, count(distinct res.ugid)
from res, selected_groups sg, t2
where res.ugid = sg.id
and (res.package = any(@packages) or @packages = ARRAY['all'])
group by date
--end

--name: PackagesUsageOverview
--input: string date {pattern: datetime}
--input: list<string> groups
--input: list<string> packages
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
with recursive selected_groups as (
  select id from groups
  where id = any(@groups)
  union
  select gr.child_id as id from selected_groups sg
  join groups_relations gr on sg.id = gr.parent_id
),
res AS (
select DISTINCT e.id, e.event_time, u.friendly_name as user, u.id as uid, u.group_id as ugid,
coalesce(pp.name, pp1.name, pp2.name, p1.name, 'Core') as package,
coalesce(pp.package_id, pp1.package_id, pp2.package_id, p1.id) as pid
from events e
inner join event_types et on e.event_type_id = et.id
left join entities en on et.id = en.id
left join published_packages pp on en.package_id = pp.id
left join project_relations pr ON pr.entity_id = en.id
left join projects proj ON proj.id = pr.project_id
and proj.is_root = true
and proj.is_package = true
left join packages p1 on proj.name = p1.name or proj.name = p1.friendly_name
left join event_parameter_values epv inner join event_parameters ep on epv.parameter_id = ep.id and ep.name = 'package'
on epv.event_id = e.id
left join published_packages pp1 on pp1.id = epv.value_uuid
left join event_parameter_values epv1 inner join event_parameters ep1 on epv1.parameter_id = ep1.id and ep1.type = 'entity_id'
inner join entities e1 on epv1.value != 'null' and e1.id = epv1.value_uuid
inner join published_packages pp2 inner join packages p2 on p2.id = pp2.package_id on e1.package_id = pp2.id
on epv1.event_id = e.id
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where @date(e.event_time)
)
select res.package as package, res.user, res.user as name,
count(*) AS count, res.uid, res.ugid, coalesce(res.pid, '00000000-0000-0000-0000-000000000000') as pid,
max(event_time) as time_end, min(event_time) as time_start
from res, selected_groups sg
where res.ugid = sg.id
and (res.package = any(@packages) or @packages = ARRAY['all'])
GROUP BY res.package, res.user, res.uid, res.ugid, res.pid
--end
