import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import * as ui from 'datagrok-api/ui';

/** Max waiting time */
const MAX_TIME = 60000;

/** Timeout tick */
const TICK = 100;

/** Get the specified child */
export async function getElement(parent: HTMLElement, selectors: string) {
  let element: HTMLElement | null;
  let totalTime = 0;

  while (true) {
    element = parent.querySelector(selectors);

    if (element)
      break;

    if (totalTime > MAX_TIME)
      return null;

    await new Promise((resolve) => setTimeout(resolve, TICK));
    totalTime += TICK;
  }

  return element;
}

/** Get the specified view */
export async function getView(name: string) {
  let view: DG.ViewBase;
  let totalTime = 0;

  while (true) {
    view = grok.shell.v;

    if (view.name.includes(name))
      return view;

    if (totalTime > MAX_TIME)
      return null;

    await new Promise((resolve) => setTimeout(resolve, TICK));
    totalTime += TICK;
  }
}

/** Describe viewers and return the Done button */
export function describeElements(roots: HTMLElement[], description: string[]): HTMLButtonElement {
  if (roots.length !== description.length)
    throw new Error('Non-equal size of viewer roots and descritions');

  let idx = 0;
  let hint: HTMLElement;
  let msg: HTMLDivElement;
  let popup: HTMLDivElement;
  const nextBtn = ui.button('next', () => hint.click(), 'Go to the next viewer');
  const prevBtn = ui.button('prev', () => {
    idx -= 2;
    hint.click();
  }, 'Go to the previous viewer');
  const doneBtn = ui.button('done', () => hint.click(), 'Go to the next step');
  const btnsDiv = ui.divH([prevBtn, nextBtn, doneBtn]);
  btnsDiv.style.marginLeft = 'auto';
  btnsDiv.style.marginRight = '0';

  const step = () => {
    if (idx < roots.length) {
      msg = ui.divV([ui.markdown(description[idx]), btnsDiv]);
      popup = ui.hints.addHint(roots[idx], msg, 'left');
      doneBtn.hidden = (idx < roots.length - 1);
      nextBtn.hidden = (idx === roots.length - 1);
      prevBtn.hidden = (idx < 1);
      hint = ui.hints.addHintIndicator(popup, undefined, 4000);
      hint.onclick = () => {
        popup.remove();
        ++idx;
        step();
      };
    }
  };

  step();

  return doneBtn;
}

/** Description of a single element */
export function singleDescription(root: HTMLElement, description: string, tooltip: string): HTMLButtonElement {
  const clearBtn = ui.button('ok', () => hint.click(), tooltip);
  const btnDiv = ui.divH([clearBtn]);
  const msg = ui.divV([
    ui.markdown(description),
    btnDiv,
  ]);
  const popup = ui.hints.addHint(root, msg, 'left');
  btnDiv.style.marginLeft = 'auto';
  btnDiv.style.marginRight = '0';
  const hint = ui.hints.addHintIndicator(popup, undefined, 4000);
  hint.onclick = () => popup.remove();

  return clearBtn;
}

/** Close windows */
export function closeWindows() {
  grok.shell.windows.showToolbox = false;
  grok.shell.windows.showHelp = false;
  grok.shell.windows.showContextPanel = false;
  grok.shell.windows.showConsole = false;
  grok.shell.windows.showVariables = false;
  grok.shell.windows.showTables = false;
  grok.shell.windows.showColumns = false;
}
