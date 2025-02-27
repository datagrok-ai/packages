--name: PackageInfo
--input: string name
--connection: System:Datagrok
select * from packages
where name = @name;
--end


--name: FunctionInfoByName

--input: string name
--connection: System:Datagrok
select * from event_types et
where name = @name;
--end


--name: TopUsersOfPackage
--input: string name
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select u.name, count(e.id) from event_types et
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
and pp.name = @name
group by u.name
limit 50
--end


--name: TopFunctionsOfPackage
--input: string date { pattern: datetime }
--input: list<string> users
--input: string name
--connection: System:Datagrok
select et.name, count(1) from event_types et
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
and pp.name = @name
and @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
group by et.name
limit 50;
--end


--name: TopErrorsOfPackage
--input: string date { pattern: datetime }
--input: list<string> users
--input: string name
--connection: System:Datagrok
select e.error_message || '(' || e.friendly_name || ')' as error_and_event, e.error_message, e.friendly_name, count(1) from event_types et
join entities en on et.id = en.id
join published_packages pp on en.package_id = pp.id
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where
e.error_message is not null
and et.friendly_name is not null
and et.friendly_name != ''
and pp.name = @name
and @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and e.is_error = true
group by e.error_message, e.friendly_name
limit 50;
--end


--name: TopUsersOfFunction
--input: string name
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select u.name, count(e.id) from event_types et
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where
@date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and et.name = @name
group by u.name
limit 50
--end


--name: TopFunctionsOfSource
--input: string name
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select et.friendly_name, count(1) from event_types et
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where
NOT EXISTS (
    SELECT
    FROM tags t
    WHERE t.entity_id = et.id
    and t.tag = 'autostart'
)
and @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and et.source = @name
and et.friendly_name is not null
and et.friendly_name != ''
group by et.friendly_name
limit 50;
--end


--name: TopUsersOfSource
--input: string name
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select u.name, count(e.id) from event_types et
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where
@date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and et.source = @name
group by u.name
limit 50
--end
