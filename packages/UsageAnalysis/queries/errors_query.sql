--name: TopDisabledErrors
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select et.friendly_name, et.id, count(1) from event_types et
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and et.source = 'error'
and et.friendly_name is not null
and et.friendly_name != ''
and et.is_error = false
group by et.friendly_name, et.id
limit 50;
--end


--name: TopPackageErrors
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select e.error_message, count(1) from event_types et
join entities en on et.id = en.id
join published_packages pp on en.package_id = pp.id
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where
e.error_message is not null
and et.friendly_name is not null
and et.friendly_name != ''
and @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
group by e.error_message
limit 50;
--end


--name: TopErrorSources
--input: string date { pattern: datetime }
--input: list<string> users
--connection: System:Datagrok
select et.error_source, count(1) from event_types et
join events e on e.event_type_id = et.id
join users_sessions s on e.session_id = s.id
join users u on u.id = s.user_id
where @date(e.event_time)
and (u.login = any(@users) or @users = ARRAY['all'])
and et.source = 'error'
and et.is_error = true
group by et.error_source
limit 50;
--end


--name: EventErrors
--input: string date { pattern: datetime }
--connection: System:Datagrok
SELECT
    e.id,
    u.friendly_name AS user,
    e.event_time,
COALESCE(e.description, t.error_source || ': ' || e.friendly_name || E'\\n' || COALESCE(e.error_stack_trace, ''))
AS error_message,
e.error_stack_trace,
EXISTS (SELECT event_id FROM events_reports WHERE event_id = e.id) AS is_reported
FROM events e
    JOIN event_types t ON e.event_type_id = t.id
    JOIN users_sessions s ON e.session_id = s.id
    JOIN users u ON u.id = s.user_id
WHERE t.source = 'error' AND @date(e.event_time);
--end

--name: ReportsCount
--input: string date { pattern: datetime }
--connection: System:Datagrok
--input: string event_id
--output: int count
SELECT COUNT(report_id) FROM events_reports
WHERE event_id = @event_id;
--end

--name: SameErrors
--input: string date {pattern: datetime}
--input: string event_id {nullable: true}
--output: int count
--connection: System:Datagrok
WITH error_stats AS (
	SELECT COALESCE(e.description, t.error_source || ': ' || e.friendly_name || E'\\n' || COALESCE(e.error_stack_trace, ''))
           AS error, t.id, COUNT(t.error_stack_trace_hash)
    FROM events e
    JOIN event_types t ON e.event_type_id = t.id
    WHERE t.source = 'error' AND @date(e.event_time)
    GROUP BY error, t.id
)

SELECT DISTINCT rt.count FROM events e
JOIN event_types t ON t.id = e.event_type_id
JOIN error_stats rt ON rt.id = t.id
WHERE e.id = @event_id OR @event_id IS NULL;
--end

--name: TopErrors
--input: string date {pattern: datetime}
--connection: System:Datagrok
SELECT COALESCE(e.description, t.error_source || ': ' || e.friendly_name || E'\\n' || COALESCE(e.error_stack_trace, ''))
           AS error, COUNT(t.error_stack_trace_hash)
FROM events e
         JOIN event_types t ON e.event_type_id = t.id
WHERE t.source = 'error' AND @date(e.event_time)
GROUP BY error
ORDER BY count DESC LIMIT 15;
--end