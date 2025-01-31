/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import { loadProjectsList, loadIssues, loadIssueData, loadProjectData } from './api/data';
import { JiraIssue, Project } from './api/objects';
import { AuthCreds } from './api/objects';
import { getJiraCreds } from './app/credentials';
import { addJIRADetector } from './detectors';
import { JiraGridCellHandler } from './jira-grid-cell-handler';
import '../css/jira_connect.css';
import { LruCache } from "datagrok-api/dg";

export let _package = new DG.Package();
export const cache = new LruCache<string, JiraIssue>(100);
export const queried = new Set<string>();


//name: info
export function info() {
  grok.shell.info(_package.webRoot);
}

//tags: autostart
export async function _init(): Promise<void> {
  const projects = await projectsList() ?? [];
  if (projects.length > 0) {
    const projectNames = projects.map(e => e.key);
    addJIRADetector(projectNames, '');
    DG.ObjectHandler.register(new JiraGridCellHandler());
  }
}

//name: projectsList 
//output: object projects
export async function projectsList(): Promise<Project[] | null> {
  const jiraCreds = await getJiraCreds();
  const projects = await loadProjectsList(jiraCreds.host, new AuthCreds(jiraCreds.userName, jiraCreds.authKey))
  return projects;
}

//name: projectData 
//input: string projectKey
//output: object projects
export async function projectData(projectKey: string): Promise<Project | null> {
  const jiraCreds = await getJiraCreds();
  const project = await loadProjectData(jiraCreds.host, new AuthCreds(jiraCreds.userName, jiraCreds.authKey), projectKey)
  return project;
}

//name: issueData 
//input: string issueKey
//output: object issue
export async function issueData(issueKey: string): Promise<JiraIssue | null> {
  if(!issueKey || issueKey?.length === 0)
    return null;
  if (cache.has(issueKey))
    return cache.get(issueKey)!;

  queried.add(issueKey);
  const jiraCreds = await getJiraCreds();
  const issue = await loadIssueData(jiraCreds.host, new AuthCreds(jiraCreds.userName, jiraCreds.authKey), issueKey)
  queried.delete(issueKey);
  cache.set(issueKey, issue);

  return issue;
}

//name: getJiraField
//meta.vectorFunc: true
//input: column<string> ticketColumn
//input: string field
//output: column result
export async function getJiraField(ticketColumn: DG.Column, field: string): Promise<DG.Column | undefined> {
  const jiraCreds = await getJiraCreds();
  const ticketsMap = new Map<string, string>()
  const keys = field.split(':');
  const ticketColumnList = ticketColumn.toList();
  for (let i = 0; i < ticketColumnList.length; i++)
    if (ticketColumnList[i])
      ticketsMap.set(ticketColumnList[i], '');

  const ticketKeys = Array.from(ticketsMap.keys()).map(key => (key ?? '').trim());
  const totalTickets = ticketKeys.length;
  const chunkSize = 100;
  let index = 0;
  while (index < totalTickets) {
    const keysToLoad = ticketKeys.slice(index, index + chunkSize);
    try {
      const loadedIssues = await loadIssues(jiraCreds.host, new AuthCreds(jiraCreds.userName, jiraCreds.authKey),
        0, chunkSize, undefined, keysToLoad);

      upperFor:
      for (let i = 0; i < (loadedIssues?.issues.length ?? 0); i++) {
        let current: any = loadedIssues?.issues[i].fields;

        for (const key of keys) {
          if (current && key in current)
            current = current[key];
          else {
            ticketsMap.set(ticketColumnList[index + i], '');
            continue upperFor;
          }
        }
        if (Array.isArray(current))
          current = (current ?? ['']).join(', ');

        if (loadedIssues?.issues[i].key)
          ticketsMap.set(loadedIssues?.issues[i].key, (current ?? '') as string);
      }
    } catch (error) {
      console.error(`Error loading issues for index range ${index} - ${index + chunkSize}`, error);
    }

    index += chunkSize;
  }

  let resultList: string[] = [];
  for (let ticket of ticketColumnList)
    resultList.push(ticketsMap.get((ticket ?? '').trim()) ?? '');

  return DG.Column.fromStrings(field, resultList);
}
