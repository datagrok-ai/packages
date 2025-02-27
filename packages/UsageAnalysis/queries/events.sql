--name: EventsSources
--input: string date {pattern: datetime}
--connection: System:Datagrok
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
with res as (
select et.source, e.event_time as time_old
from events e
inner join event_types et on e.event_type_id = et.id
where @date(e.event_time)),
t1 AS (
  SELECT (MAX(res.time_old) - MIN(res.time_old)) as inter
  FROM res
),
t2 AS (
  SELECT case when inter >= INTERVAL '6 month' then 864000
  when inter >= INTERVAL '70 day' then 216000
	when inter >= INTERVAL '10 day' then 86400
	when inter >= INTERVAL '2 day' then 14400
	when inter >= INTERVAL '3 hour' then 3600
	else 600 end as trunc
from t1
)
select res.source, count(*),
to_timestamp(floor((extract('epoch' from res.time_old) / trunc )) * trunc)
AT TIME ZONE 'UTC' as time_start,
to_timestamp(floor((extract('epoch' from res.time_old) / trunc )) * trunc)
AT TIME ZONE 'UTC' + trunc * interval '1 sec' as time_end
from res, t2
GROUP BY res.source, time_start, time_end
--end


--name: EventsUsersSources
--input: string date {pattern: datetime}
--input: list<string> groups
--connection: System:Datagrok
--meta.cache: all
--meta.cache.invalidateOn: 0 0 * * *
with recursive selected_groups as (
  select id from groups
  where id = any(@groups)
  union
  select gr.child_id as id from selected_groups sg
  join groups_relations gr on sg.id = gr.parent_id
),
res as (
select et.source, e.event_time as time_old, u.friendly_name as user,
u.id as uid, u.group_id as ugid
from events e
inner join event_types et on e.event_type_id = et.id
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where @date(e.event_time)),
t1 AS (
  SELECT (MAX(res.time_old) - MIN(res.time_old)) as inter
  FROM res
),
t2 AS (
  SELECT case when inter >= INTERVAL '6 month' then 864000
  when inter >= INTERVAL '70 day' then 216000
	when inter >= INTERVAL '10 day' then 86400
	when inter >= INTERVAL '2 day' then 14400
	when inter >= INTERVAL '3 hour' then 3600
	else 600 end as trunc
from t1
)
select res.source, res.user, count(*), res.uid, res.ugid,
to_timestamp(floor((extract('epoch' from res.time_old) / trunc )) * trunc)
AT TIME ZONE 'UTC' as time_start,
to_timestamp(floor((extract('epoch' from res.time_old) / trunc )) * trunc)
AT TIME ZONE 'UTC' + trunc * interval '1 sec' as time_end
from res, t2, selected_groups sg
where res.ugid = sg.id
GROUP BY res.source, time_start, time_end, res.user, res.uid, res.ugid
--end
