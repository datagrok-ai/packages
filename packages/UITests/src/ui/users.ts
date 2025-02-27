import { after, before, category, expect, test, awaitCheck, delay } from '@datagrok-libraries/utils/src/test';
import * as grok from 'datagrok-api/grok';
//import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';


category('UI: Users', () => {
  before(async () => {
    const mng: DG.TabPane = grok.shell.sidebar.getPane('Browse');
    mng.header.click();
    await delay(1000);
    let platform: any;
    await awaitCheck(() => {
      platform = Array.from(document.querySelectorAll('div.d4-tree-view-node'))
        .find((el) => el.textContent === 'Platform');
      return platform !== undefined;
    }, '', 2000);
    if ((platform.nextElementSibling as HTMLElement).style.display === 'none')
      (platform.firstElementChild as HTMLElement).click();
    const groups = Array.from(document.querySelectorAll('div.d4-tree-view-item-label'))
      .find((el) => el.textContent === 'Users') as HTMLElement;
    groups.click();
    await delay(500);

    let userToDelete = await grok.dapi.users.filter('login = "newlogin"').first();;
    if (userToDelete)
      grok.dapi.users.delete(userToDelete);
  });

  /*
  test('filters.all', async () => {
    const usapi = await grok.dapi.users
      .list()
      .then((users) => users.length);
    const regex = new RegExp(`[0-9]+ / ${usapi}`, 'g');
    const all = Array.from(tb.querySelectorAll('label'))
      .find((el) => el.textContent === 'All');
    if (all === undefined) throw new Error('cannot find All');
    all.click();
    await awaitCheck(() => {
      if (document.querySelector('.grok-items-view-counts') !== null)
        return regex.test((document.querySelector('.grok-items-view-counts') as HTMLElement).innerText);
      return false;
    }, 'number of users does not match', 3000);
  });

  test('filters.recentlyJoined', async () => {
    const usapi = await grok.dapi.users
      .filter('joined > -1w')
      .list()
      .then((users) => users.length);
    const regex = new RegExp(`[0-9]+ / ${usapi}`, 'g');
    const rj = Array.from(tb.querySelectorAll('label'))
      .find((el) => el.textContent === 'Recently joined');
    if (rj === undefined) throw new Error('cannot find Recently Joined');
    await rj.click();
    setTimeout(async () => {
      await awaitCheck(() => {
        if (document.querySelector('.grok-items-view-counts') !== null)
          return regex.test((document.querySelector('.grok-items-view-counts') as HTMLElement).innerText);
        return false;
      }, 'number of users does not match', 3000);
    }, 10);
  });
  */

  test('actions.addUser', async () => {
    const user = DG.User.create();
    user.login = 'newlogin';
    user.status = DG.USER_STATUS.STATUS_NEW;
    user.firstName = 'new';
    user.lastName = 'user';
    await grok.dapi.users.save(user);
    await grok.dapi.users.delete(user);
  });

  test('actions.addServiceUser', async () => {
    const dialogsBefore = DG.Dialog.getOpenDialogs().length;
    await showDialog('Service User...');
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length === dialogsBefore + 1, 'Add Service User dialog was not shown', 1000);
    const diag = DG.Dialog.getOpenDialogs()[0];
    const cancel = diag.root.querySelector('[class="ui-btn ui-btn-ok"]') as HTMLElement;
    cancel.click();
  }, { timeout: 100000 });

  test('actions.inviteFriend', async () => {
    const dialogsBefore = DG.Dialog.getOpenDialogs().length;
    await showDialog('Invite a Friend...');
    await awaitCheck(() => DG.Dialog.getOpenDialogs().length === dialogsBefore + 1, 'Invite a friend dialog was not shown', 1000);
    const diag = DG.Dialog.getOpenDialogs()[0];
    const cancel = diag.root.querySelector('[class="ui-btn ui-btn-ok"]') as HTMLElement;
    cancel.click();
  }, { timeout: 100000 });

  test('user.panel', async () => {
    await awaitCheck(() => {
      if (document.querySelector('.grok-gallery-grid') !== null)
        return document.querySelector('.grok-gallery-grid')!.children.length !== 0;
      return false;
    }, 'cannot load all users', 3000);
    const user = document.querySelector('.grok-gallery-grid')!.children[0] as HTMLElement;
    grok.shell.windows.showProperties = true;
    const regex = new RegExp('Groups', 'g');
    console.log('usr click')
    user.click();
    await delay(100);
    await awaitCheck(() => {
      if (document.querySelector('.grok-entity-prop-panel') !== null)
        return regex.test((document.querySelector('.grok-entity-prop-panel') as HTMLElement).innerText);
      return false;
    }, 'cannot find user\'s groups', 3000);
    const userInfo = document.querySelector('.grok-entity-prop-panel') as HTMLElement;
    const pict = userInfo.querySelector('.grok-user-profile-picture');
    const desc = userInfo.innerText;
    const b = (pict !== null) && desc.includes('Groups') && desc.includes('Joined');
    expect(b, true);
  }, { timeout: 100000 });

  after(async () => {
    grok.shell.closeAll();
  });

  async function showDialog(label: string) {
    const cng = Array.from(document.querySelectorAll('.ui-btn'))
      .find((el) => el.textContent === 'New');
    if (cng === undefined) throw new Error(`cannot find New User button`);
    (cng as HTMLButtonElement).focus();
    (cng as HTMLButtonElement).click();
    const rect = cng.getBoundingClientRect();

    const pageX = window.pageXOffset + rect.left;
    const pageY = window.pageYOffset + rect.top;

    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
      detail: 1,
      clientX: pageX,
      clientY: pageY
    });
    cng.dispatchEvent(mouseDown);
    await delay(1000);
    let optn: any;
    await awaitCheck(() => {
      optn = Array.from(document.querySelectorAll('.d4-menu-item-label'))
        .find((el) => el.textContent === label);
      return optn !== undefined;
    }, `Cannot load form by button ${label}`, 1000);
    await delay(500);
    // (optn as HTMLElement).parentElement?.addEventListener('click', () => grok.shell.error('CLICK'));
    optn.click();
  };
}, { clear: false, owner: 'aparamonov@datagrok.ai' });
