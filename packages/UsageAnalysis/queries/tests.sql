--name: TestTrack
--connection: System:Datagrok
--input: string batchName
Select * from (
   select distinct on (t.name)  
  case when r.passed is null then 'did not run' when r.skipped then 'skipped' when r.passed then 'passed' when not r.passed then 'failed' else 'unknown' end as status,
  r.date_time as date,
  t.name as test, 

  r.params,	
  r.params::json->>'severityLevel' as severityLevel,  
  r.params::json->>'batchName' as batchName,
  r.params::json->>'version' as version,
  r.params::json->>'result' as reason,
  r.params::json->>'uid' as uid,
  r.params::json->>'start' as start
from tests t full join builds b on 1 = 1
left join test_runs r on r.test_name = t.name and r.build_name = b.name   
where t.type = 'manual' and not r.passed is null and (r.params::json->>'batchName') = @batchName
order by   t.name, r.date_time desc  
) as testsData
order by testsData.date desc
--end

--name: LastStatuses
--connection: System:Datagrok
--input: string path
--input: string batchToExclude
Select * from (
   select distinct on ( (r.params::json->>'batchName'))  
  case when r.passed is null then 'did not run' when r.skipped then 'skipped' when r.passed then 'passed' when not r.passed then 'failed' else 'unknown' end as status,
  r.date_time as date,
  t.name as test, 

  r.params,	
  r.params::json->>'severityLevel' as severityLevel, 
  r.params::json->>'batchName' as batchName,
  r.params::json->>'version' as version,
  r.params::json->>'result' as reason,
  r.params::json->>'uid' as uid, 
  r.params::json->>'start' as start
from tests t full join builds b on 1 = 1
left join test_runs r on r.test_name = t.name and r.build_name = b.name   
where t.type = 'manual' and (t.name =  concat('Test Track: ', @path) or t.name = concat('Unknown: ', @path))
and NOT (r.params::json->>'batchName') =  @batchToExclude   and not r.passed is null
order by   (r.params::json->>'batchName'), r.date_time desc 
limit 5 ) as testsData
order by testsData.date desc
--end

--name: TestingNames
--connection: System:Datagrok 
--output: dataframe df
select * from (
Select distinct on ((r.params::json->>'batchName'))   
  (r.params::json->>'batchName') as batchName,
  (r.params::json->>'version') as version, 
  (r.params::json->>'start')as start,
    r.date_time as date
from tests t full join builds b on 1 = 1
left join test_runs r on r.test_name = t.name and r.build_name = b.name   
where t.type = 'manual' 
order by (r.params::json->>'batchName')) as a
order by a.date desc
--end

--name: TestingName
--connection: System:Datagrok 
--input: string version
--input: string uid
--input: string start
--output: string name
Select distinct on ((r.params::json->'batchName')::varchar(255))  
  (r.params::json->>'batchName')::varchar(255) as batchName,
  (r.params::json->>'version')::varchar(255) as version,
  (r.params::json->>'start')::varchar(255) as start,
    r.date_time as date
from tests t full join builds b on 1 = 1
left join test_runs r on r.test_name = t.name and r.build_name = b.name   
where t.type = 'manual' 
  and (r.params::json->>'uid')::varchar(255) = @uid::varchar
  and (r.params::json->>'version')::varchar(255) =  @version
  and (r.params::json->>'start')::varchar(255) = @start
order by (r.params::json->'batchName')::varchar(255), r.date_time 
limit 1
--end

--name: Builds
--connection: System:Datagrok
select distinct on(commit) name as text, build_date as build, commit as id ,
coalesce((select min(b2.build_date) from builds b2 where b2.build_date > b.build_date), now() at time zone 'utc') as next 
from (select * from builds order by build_date) b 
order by commit
--end

--name: getTestStatusesAcordingDF 
--connection: System:Datagrok 
--meta.cache: all
--input: string buildId
--input: dataframe testslist 

select distinct on (t.name)
  b.name as build,
  t.name as test,
  t.type,
  t.package,
  r.date_time,
  r.passed,
  case when r.passed is null then 'did not run' when r.skipped then 'skipped' when r.passed then 'passed' when not r.passed then 'failed' else 'unknown' end as status,
  r.result,
  r.duration,
  r.skipped,
  r.params
from tests t full join builds b on 1 = 1
left join test_runs r on r.test_name = t.name and r.build_name = b.name
full outer join @testslist df on df.name =  t.friendly_name
where b.name = @buildId 
order by t.name, r.date_time desc 
--end 

--name: ManualTestingTestStatuses
--connection: System:Datagrok
--input: string batchName
Select * from (
   select distinct on (t.name)  
  case when r.passed is null then 'did not run' when r.skipped then 'skipped' when r.passed then 'passed' when not r.passed then 'failed' else 'unknown' end as status,
  r.date_time as date,
  t.name as test, 

  r.params,	
  r.params->'batchName' as batchName,
  r.params->'version' as version,
  r.params->'result' as reason,
  r.params->'uid' as uid, 
  r.params->'start' as start,
  u.friendly_name
from tests t full join builds b on 1 = 1
left join test_runs r on r.test_name = t.name and r.build_name = b.name 
left join users u on    u.id::text = r.params->>'uid'::text
where t.type = 'manual' and not r.passed is null and (r.params::json->'batchName')::varchar(255) = @batchName
order by   t.name, r.date_time desc  
) as testsData
order by testsData.date desc
--end 
