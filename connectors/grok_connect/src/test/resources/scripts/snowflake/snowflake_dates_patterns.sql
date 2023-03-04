create table DATES_PATTERNS (
    date DATE
);

insert into DATES_PATTERNS (date) values (CURRENT_DATE);
insert into DATES_PATTERNS (date) values (CURRENT_DATE - 1); -- yesterday
insert into DATES_PATTERNS (date) values (LAST_DAY(CURRENT_DATE, 'WEEK')); -- last day of this week
insert into DATES_PATTERNS (date) values (CURRENT_DATE - 150);
insert into DATES_PATTERNS (date) values ('2021-04-09');