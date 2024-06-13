import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import { Observable } from 'rxjs';
import { Tutorial } from '@datagrok-libraries/tutorials/src/tutorial';


export class MultivariateAnalysisTutorial extends Tutorial {
  get name() { return 'Multivariate Analysis'; }
  get description() {
    return `Multivariate analysis reveals complex interactions and patterns within a dataset. It uses 
    statistical techniques to explore the relationships among multiple variables.`;
  }
  get steps() { return 7; }
    
  demoTable: string = 'cars.csv';
  helpUrl: string = 'https://datagrok.ai/help/explore/multivariate-analysis/pls';

  protected async _run() {
    this.header.textContent = this.name;

    grok.shell.windows.context.visible = false;
    grok.shell.windows.help.visible = false;

    this.describe(`Partial Least Squares Regression (PLS) models the relationship 
    between independent variables (predictors) and dependent variables (responses). Use it 
    when there are a large number of predictors, multicollinearity among them, and relatively few observations.`);

    this.describe(ui.link('More about ' + this.name, this.helpUrl).outerHTML);

    const plsDlg = await this.openDialog('Click on "ML | Analyze | Multivariate Analysis..."',
      'Multivariate Analysis (PLS)', this.getMenuItem('ML'));

    plsDlg.root.hidden = true;
    
    // We create fake dialog that runs analysis (since inputs of the "main" dialog are added using ui.form).
    const dlg = ui.dialog({title: 'Multivariate Analysis (PLS)', helpUrl: this.helpUrl});

    dlg.add(ui.columnInput('Predict', this.t!, null, () => {}, {
      filter: (col: DG.Column) => (col.type === DG.COLUMN_TYPE.INT) || (col.type === DG.COLUMN_TYPE.FLOAT)
    }));
  
    dlg.add(ui.columnsInput('Using', this.t!, () => {}, {
      available: this.t!.columns.toList().filter((col) => 
        (col.type === DG.COLUMN_TYPE.INT) || (col.type === DG.COLUMN_TYPE.FLOAT)
      ).map((col) => col.name),
      checked: [],
    }));
  
    dlg.add(ui.intInput('Components', null, () => {}));
  
    dlg.add(ui.columnInput('Names', this.t!, null, () => {}, {
      filter: (col: DG.Column) => (col.type === DG.COLUMN_TYPE.STRING)
    }));

    let viewers = [] as DG.Viewer[];
  
    dlg.addButton('RUN', () => {
      dlg.close();
      plsDlg.getButton('RUN').click();

      setTimeout(() => {
        viewers = [...(grok.shell.v as DG.TableView).viewers];
        //console.log(viewers);
      }, 2000);
    }, undefined, 'Perform multivariate analysis');
  
    dlg.show();
      
    await this.dlgInputAction(dlg, 'Set "Predict" to "price"', 'Predict', 'price',
      'Specify column with the response variable.');
      
    await this.dlgInputAction(dlg, 'Select all columns, except "price", as "Using"', 'Using',
      this.t!.columns.names().filter((n: string) => n !== 'model' && n !== 'price').join(','),
      `Set columns with predictors' values. Click "All" in the column selection dialog and uncheck "price".`);

    await this.dlgInputAction(dlg, 'Set the number of components to "3"', 'Components', '3',
      'Define the number of the latent factors.');
    
    await this.dlgInputAction(dlg, 'Set "Names" to "model"', 'Names', 'model',
      'Select column with data samples names.');

    await this.action('Press "RUN" and wait for the analysis', dlg.onClose);

    let viewerRoots: HTMLElement[];
      
    const viewerMd = [
      '# Observed vs. Predicted\n\nCloser to the line means better price prediction.',
      '# Scores\n\n' +      
      'Similarities & dissimilarities among samples:\n\n' +       
      "* volvo's are close to each other\n" + 
      '* porsche & mercedes are different',
      '# Loadings\n\n' +       
      'The impact of each feature on the latent factors: higher loading means stronger influence.',
      '# Regression Coefficients\n\n' +      
      'Parameters of the obtained linear model:\n\n' +       
      '* features make different contribution to the prediction\n' +
      '* "diesel" effects the most',
      '# Explained Variance\n\n' +       
      'How well the latent factors fit source data:\n\n' + 
      '* closer to one means better fit\n' +
      '* 3 latent components explain 92% of the price variation',
    ];
    
    let idx = 0;
    let hint: HTMLElement;
    let msg: HTMLDivElement;
    let popup: HTMLDivElement;
    const nextBtn = ui.button('next', () => hint.click(), 'Go to the next viewer');
    const prevBtn = ui.button('prev', () => {
      idx -= 2;
      hint.click();
    }, 'Go to the previous viewer');
    const doneBtn = ui.button('done', () => hint.click(), 'Complete this tutorial');
    const btnsDiv = ui.divH([prevBtn, nextBtn, doneBtn]);
    btnsDiv.style.marginLeft = 'auto';
    btnsDiv.style.marginRight = '0';

    const step = () => {
      if (idx < viewerRoots.length) {
        msg = ui.divV([ui.markdown(viewerMd[idx]), btnsDiv]);
        popup = ui.hints.addHint(viewerRoots[idx], msg, 'left');
        doneBtn.hidden = (idx < viewerRoots.length - 1);
        nextBtn.hidden = (idx === viewerRoots.length - 1);
        prevBtn.hidden = (idx < 1);
        hint = ui.hints.addHintIndicator(popup, undefined, 3000);
        hint.onclick = () => {
          popup.remove();
          ++idx;
          step();
        };
      }
    };

    setTimeout(async () => {
      viewerRoots = [
        viewers[1].root, // Observed vs. Predicted scatterplot
        viewers[4].root, // Scores scatterplot
        viewers[3].root, // Loadings scatterplot
        viewers[2].root, // Regression coeffs bar chart
        viewers[5].root, // Explained variances bar chart
      ];

      step();
    }, 2100);
    
    await this.action('Explore each viewer', new Observable((subscriber: any) => {
      //@ts-ignore
      $(doneBtn).one('click', () => subscriber.next(true));
    }), undefined, 'Press "Next" to switch to the next viewer');    
  }
}
