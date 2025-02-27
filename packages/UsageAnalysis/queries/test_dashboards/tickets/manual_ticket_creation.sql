--name: Manual Ticket Creation
--friendlyName: UA | Tickets | Create Ticket
--connection: UA_tickets
--input: string name

insert into ua_tickets.tickets (name) values (@name) 