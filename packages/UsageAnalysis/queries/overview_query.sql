--name: UniqueUsersList
--input: string date { pattern: datetime }
--meta.cache: true
--meta.invalidate: 0 * * * *
--connection: System:Datagrok
select u.name, u.id from events e
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where @date(e.event_time)
group by u.name, u.id
--end

--name: TotalUsersAndGroups
--meta.cache: true
--meta.invalidate: 0 * * * *
--connection: System:Datagrok
with
g as (select count(1) as c from groups where personal = false),
u as (select count(1) as c from groups where personal = true)
select u.c as user_count, g.c as group_count from u, g
--end
