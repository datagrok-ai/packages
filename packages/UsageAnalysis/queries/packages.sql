--name: PackagesUsage
--input: string date {pattern: datetime}
--input: list<string> groups
--input: list<string> packages
--input: list<string> packagesCategories
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
--test: PackagesUsage(date='today', ['1ab8b38d-9c4e-4b1e-81c3-ae2bde3e12c5'], ['all'], ['any'])
with recursive selected_groups as (
    select id from groups
    where id = any(@groups)
    union
    select gr.child_id as id from selected_groups sg
    join groups_relations gr on sg.id = gr.parent_id
),
res AS (
    select e.id, e.event_time as time_old, u.friendly_name as user, u.id as uid, u.group_id as ugid,
    coalesce(pp.name, p.name, 'Core') as package,
    coalesce(pp.package_id, p.id) as pid, p.category
    from events e
    inner join users_sessions s on e.session_id = s.id
    inner join users u on u.id = s.user_id
    inner join event_parameter_values evv on evv.value_uuid is not null and evv.event_id = e.id
    inner join entities en on en.id = evv.value_uuid
    inner join published_packages pp on en.package_id = pp.id
    inner join packages p on p.id = pp.package_id
where @date(e.event_time) and (@packagesCategories = ARRAY['any'] or p.category = any(@packagesCategories))
    ),
    t1 AS (
SELECT (MAX(res.time_old) - MIN(res.time_old)) as inter
FROM res),
    t2 AS (
SELECT case
    when inter >= INTERVAL '1 year' then 1728000
    when inter >= INTERVAL '6 month' then 864000
    when inter >= INTERVAL '70 day' then 432000
    when inter >= INTERVAL '10 day' then 86400
    when inter >= INTERVAL '2 day' then 21600
    when inter >= INTERVAL '3 hour' then 3600
    else 600 end as trunc
from t1)
select res.package, res.user, count(*) AS count,
to_timestamp(floor((extract('epoch' from res.time_old) / trunc )) * trunc)
AT TIME ZONE 'UTC' as time_start,
to_timestamp(floor((extract('epoch' from res.time_old) / trunc )) * trunc)
AT TIME ZONE 'UTC' + trunc * interval '1 sec' as time_end,
res.uid, res.ugid, coalesce(res.pid, '00000000-0000-0000-0000-000000000000') as pid
from res, t2, selected_groups sg
where res.ugid = sg.id and (res.package = any(@packages) or @packages = ARRAY['all'])
GROUP BY res.package, res.user, time_start, time_end, res.uid, res.ugid, res.pid
--end


--name: PackagesContextPaneFunctions
--input: int time_start
--input: int time_end
--input: list<string> users
--input: list<string> packages
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
--test: PackagesContextPaneFunctions(1681084800, 1681516800, ['878c42b0-9a50-11e6-c537-6bf8e9ab02ee'], ['00000000-0000-0000-0000-000000000000'])
with res AS (
select DISTINCT e.id as id_, coalesce(pp.name, p1.name, 'Core') as package, en.id, et.name,
coalesce(pp.package_id, p1.id, '00000000-0000-0000-0000-000000000000') as pid
from events e
inner join event_parameter_values evv on evv.event_id = e.id
inner join funcs et on evv.value_uuid = et.id
inner join entities en on et.id = en.id
left join published_packages pp on en.package_id = pp.id
left join project_relations pr ON pr.entity_id = en.id
left join projects proj ON proj.id = pr.project_id
and proj.is_root = true
and proj.is_package = true
left join packages p1 on proj.name = p1.name or proj.name = p1.friendly_name
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where e.event_time between to_timestamp(@time_start)
and to_timestamp(@time_end)
and u.id = any(@users)
)
select res.package, res.id, res.name, res.pid, count(*)::int
from res
where res.pid = any(@packages)
group by res.package, res.id, res.name, res.pid
--end


--name: PackagesContextPaneLogs
--input: int time_start
--input: int time_end
--input: list<string> users
--input: list<string> packages
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
--test: PackagesContextPaneLogs(1681084800, 1681516800, ['878c42b0-9a50-11e6-c537-6bf8e9ab02ee'], ['00000000-0000-0000-0000-000000000000'])
with res as (
select DISTINCT e.id, et.source,
coalesce(pp1.package_id, '00000000-0000-0000-0000-000000000000') as pid
from events e
inner join event_types et on e.event_type_id = et.id
left join event_parameter_values epv inner join event_parameters ep on epv.parameter_id = ep.id and ep.name = 'package'
on epv.event_id = e.id
left join published_packages pp1 on pp1.id = epv.value_uuid
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where et.source in ('debug', 'error', 'info', 'warning', 'usage')
and e.event_time between to_timestamp(@time_start)
and to_timestamp(@time_end)
and u.id = any(@users)
)
select res.source, count(*)::int
from res
where res.pid = any(@packages)
group by res.source
--end


--name: PackagesContextPaneAudit
--input: int time_start
--input: int time_end
--input: list<string> users
--input: list<string> packages
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
--test: PackagesContextPaneAudit(1681084800, 1681516800, ['878c42b0-9a50-11e6-c537-6bf8e9ab02ee'], ['00000000-0000-0000-0000-000000000000'])
with res as (
select DISTINCT e.id, et.friendly_name as name,
coalesce(pp2.package_id, '00000000-0000-0000-0000-000000000000') as pid
from events e
inner join event_types et on e.event_type_id = et.id
left join event_parameter_values epv1 inner join event_parameters ep1 on epv1.parameter_id = ep1.id and ep1.type = 'entity_id'
inner join entities e1 on epv1.value != 'null' and e1.id = epv1.value_uuid
inner join published_packages pp2 inner join packages p2 on p2.id = pp2.package_id on e1.package_id = pp2.id
on epv1.event_id = e.id
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where et.source = 'audit'
and e.event_time between to_timestamp(@time_start)
and to_timestamp(@time_end)
and u.id = any(@users)
)
select res.name, count(*)::int
from res
where res.pid = any(@packages)
group by res.name
--end


--name: PackagesInstallationTime
--input: string date {pattern: datetime}
--input: list<string> packages
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
--connection: System:Datagrok
select e.event_time, ppp.name as package, v.value::int as time
from events e
inner join event_types t on t.id = e.event_type_id and t.source = 'audit' and t.friendly_name = 'package-version-published'
left join event_parameter_values v 
inner join event_parameters p on p.id = v.parameter_id and p.name = 'ms' on v.event_id = e.id
left join event_parameter_values vp 
inner join event_parameters pp on pp.id = vp.parameter_id and pp.name = 'entity' on vp.event_id = e.id
inner join packages ppp on ppp.id::text = vp.value
where @date(e.event_time)
and (ppp.name = any(@packages) or @packages = ARRAY['all'])
--end

--name: PackagesCategories
--connection: System:Datagrok
select DISTINCT category from packages;
--end
