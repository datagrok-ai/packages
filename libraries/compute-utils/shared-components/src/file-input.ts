/* eslint-disable max-len */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {BehaviorSubject, Subject} from 'rxjs';
import '../css/file-input.css';

export const EXCEL_BLOB_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export class FileInput extends DG.InputBase<File | null> {
  // events to emit
  public uploadedFile$ = new Subject<File | null>();
  // legacy compatibility
  public onFileUploaded = this.uploadedFile$;

  // Real file value
  private fileValue: File | null = null;
  // Validation object
  private isValid = new BehaviorSubject<boolean>(true);

  private hiddenInput = document.createElement('input');
  private icon = ui.iconFA('cloud-upload', () => this.hiddenInput.click());

  public get value() {
    return this.fileValue;
  }

  public set value(value: File | null) {
    this.stringValue = value?.name || 'Drag-n-drop your file';
    this.fileValue = value;

    if (this.notify)
      this.fireInput();
  }

  constructor(
    public initialText = 'Drag-n-drop here',
    public initialValue: File | null = null,
    public onValueChanged: Function | null = null,
    public fileType: string | null = EXCEL_BLOB_TYPE,
  ) {
    const primaryInput = ui.input.string('Input file', {value: ''});
    super(primaryInput.dart);
    this.subscribeOnEvents();

    this.root.style.display = 'flex';

    this.isValid.subscribe((isValid) => {
      if (isValid) {
        this.input.classList.remove('error');
        this.input.classList.add('success');
        const newIcon = ui.iconFA('times', () => this.reset(), 'Reset uploaded file');
        this.icon.replaceWith(newIcon);
        this.icon = newIcon;
      } else {
        this.input.classList.remove('success');
        this.input.classList.add('error');
        const newIcon = ui.iconFA('redo', () => this.hiddenInput.click(), 'Re-upload a file');
        this.icon.replaceWith(newIcon);
        this.icon = newIcon;
      }
    });

    this.uploadedFile$.subscribe((newValue: File | null) => {
      if (this.onValueChanged)
        this.onValueChanged(newValue);

      if (!newValue) {
        const newIcon = ui.iconFA('cloud-upload', () => this.hiddenInput.click(), 'Choose a file to upload');
        this.icon.replaceWith(newIcon);
        this.icon = newIcon;
      }

      this.value = newValue;
    });

    this.reset();
  }

  private subscribeOnEvents() {
    (this.input as HTMLInputElement).readOnly = true;
    this.input.classList.add('default');

    const handleFiles = async (files: FileList | null) => {
      if (!files || !files.length || !this.enabled)
        return;

      if (files.length > 1) {
        this.isValid.next(false);
        throw new Error('Please specify single input file');
      }

      if (this.fileType && files[0].type !== this.fileType) {
        this.isValid.next(false);
        throw new Error('File type is not supported');
      }

      if (this.isValid.value)
        this.uploadedFile$.next(files[0]);
      else
        this.uploadedFile$.next(null);
    };

    this.root.classList.add('fi-drop-area');
    this.root.style.width = '100%';

    // hidden input to handle file dialog
    this.hiddenInput.type = 'file';
    this.hiddenInput.addEventListener('change', async () => await handleFiles(this.hiddenInput.files), false);

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      this.input.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      this.input.addEventListener(eventName, () => {
        this.input.classList.add('drag-n-dropping');
      }, false);
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      this.input.addEventListener(eventName, () => {
        this.input.classList.remove('drag-n-dropping');
      }, false);
    });

    // Handle dropped files
    this.input.addEventListener('drop', async (e: DragEvent) => {
      const dt = e.dataTransfer;
      const files = dt!.files;
      handleFiles(files);
    }, false);

    // Pass clicks to hidden file input
    this.input.addEventListener('click', () => this.hiddenInput.click(), false);
    this.addOptions(this.icon);

    ['drag', 'dragenter'].forEach((eventName) => {
      document.getElementsByClassName('layout-workarea')[0].addEventListener(eventName, (e) => {
        e.stopPropagation();
      }, false);
    });
  }

  private reset() {
    this.input.classList.value = 'ui-input-editor default';
    this.hiddenInput.value = '';
    this.uploadedFile$.next(null);
  }
}
