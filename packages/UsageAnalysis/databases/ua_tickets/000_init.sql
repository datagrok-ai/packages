create table ua_tickets.tickets (
  name varchar(64) primary key
);

GRANT ALL ON TABLE ua_tickets.tickets to :LOGIN;
