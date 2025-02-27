--name: entity links
--connection: System:Datagrok
--tags: log

-- connection <-> query
select
  'connection' as node1_type,
  connection_id::text as node1,
  connections.name as node1_name,
  '/images/connectors/' || lower(connections.data_source) || '.png' as node1_pic,
  'query' as node2_type,
  queries.id::text as node2,
  queries.name as node2_name,
  '/images/entities/data_query.png' as node2_pic,
  '"' || queries.name || '" query uses "' || connections.name || '" connection' as description
from queries
join connections on queries.connection_id = connections.id

union

-- user <-> comment
select
  'comment' as node1_type,
  comments.id::text as node1,
  comments.text as node1_name,
  '/images/entities/chat.png' as node1_pic,
  'user' as node2_type,
  user_id::text as node2,
  users.login as node2_name,
  users.picture as node2_pic,
  users.login || ' posted on ' || comments.posted as description
from comments
join users on comments.user_id = users.id

union

-- chat <-> comment
select
  'comment' as node1_type,
  comments.id::text as node1,
  comments.text as node1_name,
  '/images/entities/chat.png' as node1_pic,
  'chat' as node2_type,
  chats.id::text as node2,
  chats.name as node2_name,
 '/images/entities/chat.png' as node3_pic,
  'posted on ' || comments.posted as description
from comments
join chats on comments.chat_id = chats.id

union

-- user <-> chat
select
  'chat' as node1_type,
  chats.id::text as node1,
  chats.name as node1_name,
  '/images/entities/chat.png' as node1_pic,
  'user' as node2_type,
  user_id::text as node2,
  users.login as node2_name,
  users.picture as node2_pic,
  users.login || ' posted on ' || comments.posted as description
from comments
join users on comments.user_id = users.id
join chats on comments.chat_id = chats.id

union

--audit records

select et1.name as node1_type, v1.value as node1, en1.name as node1_name,
concat('images/entities/', substring(lower(regexp_replace(et1.name, E'([A-Z])', E'\_\\1','g')),2),'.png') as node1_pic,
 et2.name as node2_type, v2.value as node2, en2.name as node2_name,
 concat('images/entities/', substring(lower(regexp_replace(et2.name, E'([A-Z])', E'\_\\1','g')),2),'.png') as node2_pic,
et.name as description from event_types et
inner join events e on e.event_type_id = et.id
inner join event_parameter_values v1 on v1.event_id = e.id
inner join event_parameters p1 on v1.parameter_id = p1.id and p1.type = 'entity_id'
inner join entities en1 on en1.id = v1.value
inner join entities_types et1 on et1.id = en1.entity_type_id
inner join event_parameter_values v2 on v2.event_id = e.id and v1.value < v2.value
inner join event_parameters p2 on v2.parameter_id = p2.id and p2.type = 'entity_id'
inner join entities en2 on en2.id = v2.value
inner join entities_types et2 on et2.id = en2.entity_type_id
where et.source = 'audit'