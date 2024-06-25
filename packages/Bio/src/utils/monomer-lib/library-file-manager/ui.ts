/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import $ from 'cash-dom';
import {Subject} from 'rxjs';
import './style.css';

import {
  getUserLibSettings, setUserLibSettings
} from '@datagrok-libraries/bio/src/monomer-works/lib-settings';
import {UserLibSettings} from '@datagrok-libraries/bio/src/monomer-works/types';
import {getMonomerLibHelper, IMonomerLibFileManager} from '@datagrok-libraries/bio/src/monomer-works/monomer-utils';

import {MonomerLibFileEventManager} from './event-manager';
import {_package} from '../../../package';

export async function showManageLibrariesDialog(): Promise<void> {
  await DialogWrapper.showDialog();
}

export async function getMonomerLibraryManagerLink(): Promise<DG.Widget> {
  const link = ui.label('Manage monomer libraries');
  $(link).addClass('d4-link-action');
  link.onclick = async () => await showManageLibrariesDialog();
  return new DG.Widget(
    link
  );
}

class MonomerLibraryManagerWidget {
  private _fileManager: IMonomerLibFileManager;

  private _widget: DG.Widget;
  public get widget(): DG.Widget { return this._widget; }

  private constructor() {}

  private static instancePromise?: Promise<MonomerLibraryManagerWidget>;

  static async getInstance(): Promise<MonomerLibraryManagerWidget> {
    if (MonomerLibraryManagerWidget.instancePromise === undefined) {
      MonomerLibraryManagerWidget.instancePromise = (async () => {
        const instance = new MonomerLibraryManagerWidget();
        const libHelper = await getMonomerLibHelper();
        instance._fileManager = await libHelper.getFileManager();
        instance._widget = await instance.createWidget();
        return instance;
      })();
    }
    return MonomerLibraryManagerWidget.instancePromise;
  }

  private async createWidget() {
    const content = await this.getWidgetContent();
    const monomerLibHelper = await getMonomerLibHelper();
    monomerLibHelper.eventManager.addLibraryFileRequested$.subscribe(
      async () => await this.promptToAddLibraryFiles()
    );
    return new DG.Widget(content);
  }

  private async getWidgetContent(): Promise<HTMLElement> {
    const libControlsForm = await LibraryControlsManager.createControlsForm();
    $(libControlsForm).addClass('monomer-lib-controls-form');
    const widgetContent = ui.divV([libControlsForm]);
    return widgetContent;
  }

  private async promptToAddLibraryFiles(): Promise<void> {
    DG.Utils.openFile({
      accept: '.json',
      open: async (selectedFile) => {
        const content = await selectedFile.text();
        const name = selectedFile.name;
        const progressIndicator = DG.TaskBarProgressIndicator.create(`Adding ${name} as a monomer library`);
        try {
          await this._fileManager.addLibraryFile(content, name);
          // this.eventManager.updateLibrarySelectionStatus(name, true);
        } catch (e) {
          grok.shell.error(`File ${name} is not a valid monomer library, verify it is aligned to HELM JSON schema.`);
        } finally {
          progressIndicator.close();
        }
      },
    });
  }
}

class LibraryControlsManager {
  private constructor(
    private fileManager: IMonomerLibFileManager,
    private readonly userLibSettings: UserLibSettings,
  ) {
    this.fileManager.eventManager.updateUIControlsRequested$.subscribe(() => {
      this.updateControlsForm();
    });
    this.fileManager.eventManager.librarySelectionRequested$.subscribe(async ([fileName, isSelected]) => {
      await this.updateLibrarySelectionStatus(isSelected, fileName);
    });
  }

  private toLog(): string {
    return `LibraryControlsManager<#>`;
  }

  static async createControlsForm(): Promise<HTMLElement> {
    const logPrefix = 'LibraryControlsForm.createControlsForm()';
    _package.logger.debug(`${logPrefix}, start`);
    const [fileManager, userLibSettings] = await Promise.all([
      getMonomerLibHelper().then((libHelper) => libHelper.getFileManager()),
      await getUserLibSettings(),
    ]);
    const manager = new LibraryControlsManager(fileManager, userLibSettings);

    return manager._createControlsForm();
  }

  private _createControlsForm(): HTMLElement {
    const libraryControls = this.createLibraryControls();
    const inputsForm = ui.form(libraryControls);
    $(inputsForm).addClass('monomer-lib-controls-form');

    return inputsForm;
  }

  private updateControlsForm(): void {
    const updatedForm = this._createControlsForm();
    $('.monomer-lib-controls-form').replaceWith(updatedForm);
  }

  private createLibraryControls(): DG.InputBase<boolean | null>[] {
    const libFileNameList: string[] = this.fileManager.getValidLibraryPaths();
    return libFileNameList.map((libFileName) => this.createLibInput(libFileName));
  }

  private createLibInput(libFileName: string): DG.InputBase<boolean | null> {
    const logPrefix = `${this.toLog()}.createLibInput()`;
    _package.logger.debug(`${logPrefix}, libFileName = '${libFileName}', start`);
    const isMonomerLibrarySelected = !this.userLibSettings.exclude.includes(libFileName);
    const libInput = ui.boolInput(
      libFileName,
      isMonomerLibrarySelected,
      (isSelected: boolean) => {
        this.fileManager.eventManager.updateLibrarySelectionStatus(libFileName, isSelected);
      });
    ui.tooltip.bind(libInput.root, `Include monomers from ${libFileName}`);
    const deleteIcon = ui.iconFA('trash-alt', () => this.promptForLibraryDeletion(libFileName));
    ui.tooltip.bind(deleteIcon, `Delete ${libFileName}`);
    libInput.addOptions(deleteIcon);
    _package.logger.debug(`${logPrefix}, libFileName = '${libFileName}', end`);
    return libInput;
  }

  private async updateLibrarySelectionStatus(
    isMonomerLibrarySelected: boolean,
    libFileName: string
  ): Promise<void> {
    this.updateLibrarySettings(isMonomerLibrarySelected, libFileName);
    await setUserLibSettings(this.userLibSettings);
    const monomerLibHelper = await getMonomerLibHelper();
    await monomerLibHelper.loadLibraries(true);
    grok.shell.info('Monomer library user settings saved');
  }

  private updateLibrarySettings(
    isLibrarySelected: boolean | null,
    libFileName: string,
  ): void {
    if (isLibrarySelected) {
      // Remove selected library from exclusion list
      this.userLibSettings.exclude = this.userLibSettings.exclude.filter((libName) => libName !== libFileName);
    } else if (!this.userLibSettings.exclude.includes(libFileName)) {
      // Add unselected library to exclusion list
      this.userLibSettings.exclude.push(libFileName);
    }
  }

  private promptForLibraryDeletion(fileName: string): void {
    const dialog = ui.dialog('Warning');
    dialog.add(ui.divText(`Delete file ${fileName}?`))
      .onOK(async () => {
        try {
          const progressIndicator = DG.TaskBarProgressIndicator.create(`Deleting ${fileName} library`);
          await this.updateLibrarySelectionStatus(false, fileName);
          await this.fileManager.deleteLibraryFile(fileName);
          progressIndicator.close();
        } catch (e) {
          console.error(e);
          grok.shell.error(`Failed to delete ${fileName} library`);
        }
      })
      .showModal(false);
  }
}

class DialogWrapper {
  private constructor() { }

  private static _instance: DialogWrapper;
  private dialog?: DG.Dialog;
  private closeDialogSubject$ = new Subject<void>();

  static async showDialog(): Promise<void> {
    if (!DialogWrapper._instance) {
      DialogWrapper._instance = new DialogWrapper();
      DialogWrapper._instance.closeDialogSubject$.subscribe(
        () => { DialogWrapper._instance.dialog = undefined; }
      );
    }

    if (!DialogWrapper._instance.dialog)
      DialogWrapper._instance.dialog = await DialogWrapper._instance.getDialog();

    DialogWrapper._instance.dialog.show();
  }

  private async getDialog(): Promise<DG.Dialog> {
    const eventManager = MonomerLibFileEventManager.getInstance();
    const widget = (await MonomerLibraryManagerWidget.getInstance()).widget;
    const dialog = ui.dialog(
      {
        title: 'Manage monomer libraries',
        helpUrl: '/help/datagrok/solutions/domains/bio/bio.md#manage-monomer-libraries'
      }
    );
    $(dialog.root).css('width', '350px');
    dialog.clear();
    dialog.addButton(
      'Add',
      () => eventManager.addLibraryFile(),
      undefined,
      'Upload new HELM monomer library'
    );
    dialog.add(widget);
    dialog.onClose.subscribe(() => this.closeDialogSubject$.next());
    return dialog;
  }
}
