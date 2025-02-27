--name: TopQueriesUsingDataSource
--connection: System:Datagrok
--input: string date { pattern: datetime }
--input: list<string> users
--input: string data_source
select q.name, count(1) from events e
join queries q on e.event_type_id = q.id
join connections c on c.id = q.connection_id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where
c.data_source = @data_source
and @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
group by q.name
--end


--name: TopUsersOfQuery
--connection: System:Datagrok
--input: string name
--input: string date { pattern: datetime }
--input: list<string> users
select u.name, count(e.id) from events e
join queries q on e.event_type_id = q.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and q.name = @name
group by u.name
--end


--name: TopUsersOfConnection
--connection: System:Datagrok
--input: string name
--input: string date { pattern: datetime }
--input: list<string> users
select u.name, count(e.id) from events e
join queries q on e.event_type_id = q.id
join connections c on c.id = q.connection_id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and c.name = @name
group by u.name
