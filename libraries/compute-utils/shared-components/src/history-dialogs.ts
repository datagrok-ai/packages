import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {Subject, fromEvent} from 'rxjs';

type EditOptions = {
  title: string | null,
  description: string | null,
  tags: string[],
  favorite: 'favorited' | 'unfavorited' | 'same'
}

export class HistoricalRunEdit extends DG.Dialog {
  private _onMetadataEdit = new Subject<EditOptions>();
  public onMetadataEdit = this._onMetadataEdit.asObservable();

  constructor(funcCall: DG.FuncCall, oldIsFavorite: boolean) {
    const dlg = ui.dialog({title: 'Edit run metadata'});

    super(dlg.dart);

    let title = funcCall.options['title'] ?? '';
    let description = funcCall.options['description'] ?? '';
    let isFavorite = oldIsFavorite;
    const titleInput = ui.input.string('Title', {value: title, onValueChanged: () => title = titleInput.value});

    const dummyInput = ui.input.string(' ', {value: ''});
    const tagsLine = DG.TagEditor.create();
    (funcCall.options['tags'] ?? []).forEach((tag: string) => {
      tagsLine.addTag(tag);
    });
    dummyInput.input.replaceWith(tagsLine.root);

    const addNewTag = () => {
      if (tagInput.value === '' ||
          // @ts-ignore
          tagsLine.tags.includes(tagInput.value)
      )
        return;

      tagsLine.addTag(tagInput.value);
      tagInput.value = '';
    };
    const tagInput = ui.input.string('Tag', {value: ''}).addOptions(ui.iconFA('plus', addNewTag, 'Add this tag'));

    const enterSub = fromEvent<KeyboardEvent>(tagInput.input, 'onkeydown').subscribe((ev) => {
      if (ev.key == 'Enter') {
        ev.stopPropagation();
        addNewTag();
      }
    });
    this.sub(enterSub);

    const descInput = ui.input.string('Description', {value: description,
      onValueChanged: () => description = descInput.value});
    const favInput = ui.input.bool('Favorites', {value: isFavorite,
      onValueChanged: () => isFavorite = favInput.value});
    this.add(ui.form([
      titleInput,
      descInput,
      favInput,
      tagInput,
      dummyInput,
    ]));

    this.addButton('Save', async () => {
      if (tagInput.value !== '') {
        grok.shell.info(`Dialog has unsaved tags: ${tagInput.value}`);
        return;
      }

      let favorite = 'same';
      if (isFavorite && !oldIsFavorite) favorite = 'favorited';
      if (!isFavorite && oldIsFavorite) favorite = 'unfavorited';

      const editOptions = {
        title: (title !== '') ? title : null,
        description: (description !== '') ? description : null,
        tags: tagsLine.tags.map((el) => el as any),
        favorite,
      } as EditOptions;

      this._onMetadataEdit.next(editOptions);
      this.close();
    });
  }
}

export class HistoricalRunsDelete extends DG.Dialog {
  private _onFuncCallDelete = new Subject<Set<DG.FuncCall>>();
  public onFuncCallDelete = this._onFuncCallDelete.asObservable();

  constructor(funcCalls: Set<DG.FuncCall>) {
    const dlg =
      ui.dialog({title: `Delete ${funcCalls.size > 1 ? funcCalls.size: ''} ${funcCalls.size > 1 ? 'runs': 'run'}`});
    super(dlg.dart);

    // eslint-disable-next-line max-len
    this.add(ui.divText(`Deleted ${funcCalls.size > 1 ? funcCalls.size: ''} ${funcCalls.size > 1 ? 'runs': 'run'} ${funcCalls.size > 1 ? 'are': 'is'} impossible to restore. Are you sure?`));

    this.onOK(async () => this._onFuncCallDelete.next(funcCalls));
  }
}
