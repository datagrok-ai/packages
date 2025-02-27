--name: TopFunctions
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select et.name, count(1) from events e
join event_types et on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and et.source = 'function'
group by et.name
--end

--name: TopPackageFunctions
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select et.name, count(1) from event_types et
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where et.source = 'function-package'
and NOT EXISTS (
    SELECT
    FROM tags t
    WHERE t.entity_id = et.id
    and t.tag = 'autostart'
)
and @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
group by et.name
--end

--name: Events1
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select e.event_time::date, count(1) from events e
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
group by e.event_time::date
order by e.event_time::date;
--end

--name: TopPackages
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select pp.name, count(1) from event_types et
join entities en on et.id = en.id
join published_packages pp on en.package_id = pp.id
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where et.source = 'function-package'
and NOT EXISTS (
    SELECT
    FROM tags t
    WHERE t.entity_id = et.id
    and t.tag = 'autostart'
)
and @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
group by pp.name
limit 50
--end

--name: TopSources
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select et.source, count(1) from event_types et
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
and @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
group by et.source
limit 50;
--end
