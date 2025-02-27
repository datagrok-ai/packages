--name: FunctionErrors
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select e.event_time::date, count(1) from event_types et
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and e.error_message is not null
and et.source != 'error'
and e.is_error = true
group by e.event_time::date
order by e.event_time::date;
--end


--name: TopFunctionErrors
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select e.error_message || '(' || e.friendly_name || ')' as error_and_event, e.error_message, e.friendly_name, count(1) from event_types et
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and e.error_message is not null
and et.source != 'error'
and e.is_error = true
and e.error_message is not null
and e.error_message != ''
group by e.error_message, e.friendly_name
order by count(1) desc
limit 50;
--end

--name: TopFunctionDisabledErrors
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select e.error_message || '(' || e.friendly_name || ')' as error_and_event, e.error_message, e.friendly_name, count(1) from event_types et
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and e.error_message is not null
and et.source != 'error'
and e.is_error = false
and e.error_message is not null
and e.error_message != ''
group by e.error_message, e.friendly_name
order by count(1) desc
limit 50;
--end


--name: TopPackagesByError
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select pp.name, count(1) from event_types et
join entities en on et.id = en.id
join published_packages pp on en.package_id = pp.id
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and e.error_message is not null
and et.source != 'error'
and e.is_error = true
and e.error_message is not null
and e.error_message != ''
group by pp.name
order by count(1) desc
limit 50;
--end
