--name: Queries1
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select e.event_time::date, count(1) from events e
join queries q on e.event_type_id = q.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
group by e.event_time::date
order by e.event_time::date;
--end

--name: TopQueries
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select q.name, count(1) from events e
join queries q on e.event_type_id = q.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
group by q.name
--end

--name: TopConnections
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select c.name, count(1) from events e
join queries q on e.event_type_id = q.id
join connections c on c.id = q.connection_id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
group by c.name
--end

--name: TopDataSources
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select c.data_source, count(1) from events e
join queries q on e.event_type_id = q.id
join connections c on c.id = q.connection_id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
group by c.data_source
