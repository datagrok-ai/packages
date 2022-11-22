import * as DG from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';
import { ConsoleMessage } from 'puppeteer';

export function isExceptionElement(action: string):void {
  const exceptionElement = document.getElementsByClassName('grok-global-exception');
  if (exceptionElement.length != 0)
    throw 'exception was thrown after action: ' + action;
}

export function isColumnPresent(columns:DG.ColumnList, columnName:string): void {
  let check = false;
  if (columns.byName(columnName) == null)
    check = true;
  if (check == true)
    throw 'column ' + columnName + ' not found';
}

export function isViewerPresent(viewers:DG.Viewer[], viewerName:string): void {
  let check = false;
  for (let i:number = 0; i < viewers.length; i++) {
    if (viewers[i].type == viewerName) {
      check = true;
      break;
    }
  }
  if (check == false)
    throw viewerName + ' not found';
}

export function isErrorBallon(ballonText: string):void {
  const exceptionElement = document.getElementsByClassName('d4-balloon-content')[0] as HTMLElement;
  if (exceptionElement == undefined)
    throw 'Error ballon didn\'t appear where it should have.';
  if (exceptionElement.textContent != ballonText)
    throw 'Wrong error message on balloon';
  exceptionElement.click();
}

export function isDialogPresent(dialogTitle:string):void {
  let check = false;
  for (let i=0; i < DG.Dialog.getOpenDialogs().length; i++) {
    if (DG.Dialog.getOpenDialogs()[i].title == dialogTitle) {
      check = true;
      break;
    }
  }
  if (check == false)
    throw 'Dialog ' + dialogTitle + ' not found';
}

export function returnDialog(dialogTitle:string):DG.Dialog | undefined {
  let dialog: DG.Dialog | undefined;
  for (let i = 0; i < DG.Dialog.getOpenDialogs().length; i++) {
    if (DG.Dialog.getOpenDialogs()[i].title == dialogTitle) {
      dialog = DG.Dialog.getOpenDialogs()[i];
      return dialog;
    }
  }
}

export function setDialogInputValue(dialogTitle:string, inputName:string, value:string | number | boolean | DG.Column | DG.Column[]):void {
    returnDialog(dialogTitle)!.input(inputName).value = value;
}

export async function uploadProject(projectName:string, tableInfo:DG.TableInfo, view:DG.TableView, df:DG.DataFrame):Promise<void> {
  let project = DG.Project.create();
  project.name = projectName;
  project.addChild(tableInfo);
  project.addChild(view.saveLayout());  
  await grok.dapi.layouts.save(view.saveLayout());
  await grok.dapi.tables.uploadDataFrame(df);
  await grok.dapi.tables.save(tableInfo);
  await grok.dapi.projects.save(project);
}

export function findViewer(viewerName:string, view:DG.TableView,):DG.Viewer | undefined {
  let viewer:DG.Viewer;
  for (let i:number = 0; i < Array.from(view.viewers).length; i++) {
    if (Array.from(view.viewers)[i].type == viewerName) {
        viewer = Array.from(view.viewers)[i];
        return viewer;
    }
  }
}

export function checkHTMLElementbyInnerText(className:string, innerText:string):void {
  let elements = document.getElementsByClassName(className);
  let check = false;
  let element;
  for (let i = 0; i < elements.length; i++ ){        
      element = elements[i] as HTMLElement
      if (element.innerText == innerText)
        check = true;
  }
  if (check == false){
      throw 'element with innerText = "' + innerText + '" not found';
  }
}

export function getHTMLElementbyInnerText(className:string, innerText:string):HTMLElement | undefined {
  let elements = document.getElementsByClassName(className);
  let element;
  for (let i = 0; i < elements.length; i++ ){        
      element = elements[i] as HTMLElement
      if (element.innerText == innerText)
        return element;
  }
}

export async function waitForElement(selector: string, error: string, wait=3000): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector))
      return resolve(document.querySelector(selector) as HTMLElement);

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        clearTimeout(timeout);
        observer.disconnect();
        resolve(document.querySelector(selector) as HTMLElement);
      }
    });
    
    const timeout = setTimeout(() => {
      observer.disconnect();
      reject(new Error(error));
    }, wait);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}
