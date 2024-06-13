import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import {filter} from 'rxjs/operators';
import {Tutorial, TutorialPrerequisites} from '@datagrok-libraries/tutorials/src/tutorial';
import {Observable} from 'rxjs';
import $ from 'cash-dom';


export class SimilarityDiversitySearchTutorial extends Tutorial {
  get name() {
    return 'Similarity and Diversity Search';
  }

  get description() {
    return 'You can analyze a collection of molecules based on molecular similarity. ' +
    'Similarity Search finds structures similar to the reference molecule, ' +
    'while Diversity Search shows N molecules of different chemical classes in the dataset.';
  }

  get steps() {return 12;}
  
  helpUrl: string = 'https://datagrok.ai/help/datagrok/solutions/domains/chem/#similarity-and-diversity-search';
  demoTable: string = '';
  prerequisites: TutorialPrerequisites = {packages: ['Chem']};
  // manualMode = true;

  protected async _run() {
    this.header.textContent = this.name;

    this.describe(`You can analyze a collection of molecules based on molecular similarity.
    <b>Similarity Search</b> finds structures similar to the reference molecule,
    while <b>Diversity Search</b> shows N molecules of different chemical classes in the dataset.`);

    this.t = await grok.data.files.openTable('System:AppData/Tutorials/demo_smiles.csv');
    grok.shell.addTableView(this.t);

    this.title('Start the similarity and diversity search', true);
    this.describe(`When you open a chemical dataset, Datagrok automatically detects molecules
    and shows molecule-specific tools, actions, and information. Access them through:<br>
    <ul>
    <li><b>Chem</b> menu (it contains all chemical tools)</li>
    </ul><br>
    Let’s search for similar and diverse structures.`);

    let sim: DG.Viewer;
    let div: DG.Viewer;
    await this.action('On the Top Menu, click Chem > Search > Similarity Search...',
    grok.events.onViewerAdded.pipe(filter((data: DG.EventData) => {
      if (data.args.viewer.type === 'Chem Similarity Search')
        sim = data.args.viewer;
      return !!sim;
    })), this.getMenuItem('Chem', true));

    await this.action('Next, click Chem > Search > Diversity Search...',
    grok.events.onViewerAdded.pipe(filter((data: DG.EventData) => {
      if (data.args.viewer.type === 'Chem Diversity Search')
        div = data.args.viewer;
      return !!div;
    })), this.getMenuItem('Chem', true));

    this.title('Explore the dataset using similarity and diversity viewers', true);
    this.describe(`The similarity and diversity viewers are interactive and are synchronized with each other,
    the chemical spreadsheet (grid), and other viewers.`);

    await this.action('On the Most similar structures viewer, click the molecule next to the reference molecule',
    this.t.onCurrentRowChanged, undefined, 'Note how it’s now the current molecule in the grid');

    await this.action('Now, click any molecule in the diversity viewer',
    this.t.onCurrentRowChanged, undefined, 'Note the change in the similarity viewer');

    this.title('Lock in a reference molecule', true);
    this.describe(`By default, a reference molecule in the similarity viewer follows the current row.
    However, you can change the settings to lock it in.`);

    await this.contextMenuAction('Right-click the similarity viewer and select Properties...', 'Properties...');

    await this.action('Under Misc, clear the Follow Current Row checkbox', new Observable((subscriber: any) => {
      const observer = new MutationObserver((mutationsList, observer) => {
        mutationsList.forEach((m) => {
          //@ts-ignore
          if (m.attributeName === 'class' && m.target.innerText === 'Follow Current Row') {
            subscriber.next(true);
            observer.disconnect();
          }
        });
      });
      observer.observe($('.grok-prop-panel').get(0)!, {subtree: true, attributes: true});
    }));

    // let j = 0;
    // await this.action('Click anywhere in the viewer and in the grid', this.t.onCurrentRowChanged.pipe(filter(() => {
    //   j++;
    //   return j >= 2;
    // })), undefined, `Click anywhere in the viewer. Now click any molecule in the grid.
    // The current molecule changes, but the reference molecule stays the same.`);

    this.title('Specify a custom reference molecule', true);
    this.describe(`You can also specify a reference molecule using a sketcher either by manually drawing
    the structure or by pasting its identifier. For this tutorial, let’s paste the molecule's SMILES.`);

    const d = await this.openDialog('On the reference molecule, click the Edit icon', '',
      $('.grok-icon.fal.fa-pen.similarity-search-edit.chem-mol-view-icon').get(0));

    const MOL = 'CNc1nc(Nc2ccc(Br)cc2)nc(N)c1[N+](=O)[O-]';
    const copyButton = ui.button(ui.iconFA('clone'), () => {});
    copyButton.setAttribute('onclick', `navigator.clipboard.writeText('${MOL}')`)
    copyButton.style.height = 'initial';
    copyButton.style.margin = '0';
    await this.action('Set new reference molecule', 
      d.onClose, undefined, `In the sketcher, paste<br>
      <b>${MOL}</b>${copyButton.outerHTML}<br>
      Press <b>Enter</b> to apply.<br>
      Then, click <b>OK</b>`);

    this.title('Get insights using Context Panel', true);
    this.describe(`As you explore the dataset, the <b>Context Panel</b> dynamically updates to show data
    and actions relevant to the current object. However, freezing a reference molecule overrides
    this in the similarity viewer, keeping the focus on the chosen reference molecule while exploring other data.<br>
    In this case, to view information about a molecule on the <b>Context Panel</b>, you need to access it directly
    from the viewer. Let’s explore information about the reference molecule.`);
    
    await this.contextMenuAction('Hover over the reference molecule, click the More icon, and then Explore', 'Explore',
      $('.d4-chem-similarity-search .grok-icon.fal.fa-ellipsis-v.chem-mol-view-icon.pep-more-icon').get(0),
      'The Context Panel updates with relevant information');
    
    // let k = 0;
    // await this.action('Explore Context Panel', new Observable((subscriber: any) => {
    //   const func = () => {
    //     console.log(k);
    //     k++;
    //     if (k >= 3) {
    //       document.querySelector('.grok-prop-panel')?.removeEventListener('click', func);
    //       subscriber.next(true);
    //     }
    //   };
    //   $('.grok-prop-panel').on('click', func);
    // }));

    this.title('Add more data', true);
    this.describe(`You can change search parameters and other settings anytime. To do so, use the viewer’s settings.
    For now, let’s add some data on the molecule cards.`);

    await this.action('In the top right corner of the diversity viewer, click Tanimoto, Morgan', new Observable((subscriber: any) => {
      $('.d4-chem-diversity-search .ui-link').on('click', () => subscriber.next(true));
    }), $('.d4-chem-diversity-search .ui-link').get(0));

    await this.action('Select NumValenceElectrons column', new Observable((subscriber: any) => {
      const observer = new MutationObserver((mutationsList, observer) => {
        mutationsList.forEach((m) => {
          //@ts-ignore
          if (m.target.innerText === '1 / 31' || m.target.innerText === '1 / 32') {
            subscriber.next(true);
            observer.disconnect();
          }
        });
      });
      observer.observe($('.grok-prop-panel').get(0)!, {subtree: true, childList: true});
    }), undefined, `On the <b>Context Panel</b>:
    <ol><li>Under <b>Misc</b>, Next to <b>Molecule Properties</b>, click the column selector icon ('...').</li>
    <li>Select this column: <b>NumValenceElectrons</b>.</li>
    <li>Click <b>OK</b>.</li></ol>`);

    this.title('Color-code for quick profiling', true);
    this.describe(`Datagrok viewers can pick up color coding from the grid. Let’s color code the newly added values.
    You can further adjust the color setting in the viewer’s properties.`);

    await this.action('Add Color Coding for NumValenceElectrons column', this.t.onMetadataChanged.pipe(filter((data: DG.EventData) => {
      return data.args.change === 'set' && data.args.key === '.color-coding-type' && data.args.value === 'Linear' &&
        data.args.source.name === 'NumValenceElectrons';
    })), undefined, `<ol><li>In the grid, locate the <b>NumValenceElectrons</b> column and right-click its header.</li>
    <li>Select <b>Color Coding</b> > <b>Linear</b></li></ol>`);
  }
}
