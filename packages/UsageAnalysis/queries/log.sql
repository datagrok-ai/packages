--name: LogTail
--input: string date {pattern: datetime}
--input: list<string> groups
--input: list<string> packages
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
res AS (
select u.friendly_name as user, et.source, e.event_time, coalesce(e.description, et.name) as event_description,
 u.group_id as ugid, e.id
 from events e
inner join event_types et on e.event_type_id = et.id
left join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where @date(e.event_time)
)
select res.*
from res, selected_groups sg
where res.ugid = sg.id
and res.event_time > now() at time zone 'utc' - interval '20 minutes'
order by res.event_time
--end
