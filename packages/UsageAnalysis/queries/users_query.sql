--name: UniqueUsers
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select t.date::date, count(t.id) as user_count from (
	select distinct on (date(e.event_time), u.id) u.id, e.event_time as date
	from events e
	inner join users_sessions s on e.session_id = s.id
	inner join users u on u.id = s.user_id
	where @date(e.event_time)
	and (u.login = any(@users) or @users = ARRAY['all'])
) t
group by t.date::date
order by t.date::date;
--end

--name: UniqueSessions
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select t.date::date, count(t.id) as user_count from (
	select distinct on (date(e.event_time), u.id) u.id, e.event_time as date
	from events e
	join users_sessions s on e.session_id = s.id
	left join users u on u.id = s.user_id
	where @date(e.event_time)
	and (u.login = any(@users) or @users = ARRAY['all'])
) t
group by t.date::date;
--end

--name: Usage
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select u.login as user, u.id as user_id, t.name, t.source, e.id as event_id, e.event_time, e.description from events e
inner join event_types t on e.event_type_id = t.id
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
order by e.event_time desc
--end

--name: TopPackagesByUsers
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select t.name, count(t.id) from (
	select pp.name, u.id from event_types et
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
	group by pp.name, u.id
) t
group by t.name
limit 50;
--end


--name: TopUsers
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select u.login, count(1) from events e
inner join event_types t on e.event_type_id = t.id
inner join users_sessions s on e.session_id = s.id
inner join users u on u.id = s.user_id
where
@date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
group by u.login
--end
