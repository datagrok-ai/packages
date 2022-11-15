/* Do not change these import lines to match external modules in webpack configuration */
import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

export const _package = new DG.Package();

// Tools for calling exported C/C++-functions
import {cppFuncWrapper, Arg, ArgColumn, ArgNewColumn, ArgColumns, ArgNewColumns} 
       from '../wasm/cppRuntimeSystem';

//name: info
export function info() {
  grok.shell.info(_package.webRoot);
}

//tags: init
export async function init() {
  await initEigenPCA();  
}

// Principal Component Analysis with approximation
function pcaWithApporx(columns, numOfComponents, 
  principalComponents, approximation) {

    // create arguments
    let argData = new ArgColumns(columns, 'f32');
    let argNumComp = new Arg(numOfComponents);
    let argPComp = new ArgNewColumns('f32', columns[0].length, numOfComponents);
    let argApprox = new ArgNewColumns('f32', columns[0].length, columns.length);
    let args = [argData, argNumComp, argPComp, argApprox];

    // call exported function
    let result = cppFuncWrapper(EigenPCA, 'pcaWithApproximation', 'num', args);    

    // complete output: principalComponents
    for(let col of argPComp.data)
      principalComponents.push(col);

    // complete output: approximation
    for(let col of argApprox.data)
      approximation.push(col);

    return result;
  }

//name: verifyPCA
//input: dataframe df
//input: int numOfComponents = 4
export function verifyPCA(df, numOfComponents) {
  // check input
  if(numOfComponents < 1) {
    console.log('Uncorrect number of principal components: ' + numOfComponents);
    return;
  }

  // arguments for PCA-function call
  let columns = [];
  let principalComponents = [];
  let approximation = [];
  
  for(let col of df.columns.toList())    
    columns.push(col);
  
  // PCA
  console.log('PCA . . .');
  
  let start = new Date().getTime();
  
  let resultCode = pcaWithApporx(columns, numOfComponents, 
                                 principalComponents, approximation);
  
  let finish = new Date().getTime();

  console.log(`Time for computing PCA: ${finish - start} ms.`);

  // create dataframes with principal components and approximation if computation is successful
  if(resultCode == 0) {

    // create table with source data approximation
    let tableWithApprox = DG.DataFrame.fromColumns(approximation);
    tableWithApprox.name = 'Approximation';
    grok.shell.addTableView(tableWithApprox);

    // create table with principal components
    let tableWithPrincComp = DG.DataFrame.fromColumns(principalComponents);  
    tableWithPrincComp.name = 'PrincipalComponents';
    grok.shell.addTableView(tableWithPrincComp);
  }
  else
    console.log('PCA FAIL! Result code: ' + resultCode);  
}

//name: mad
//input: dataframe df
//input: column col1
//input: column col2
//output: double error
export function mad(df, col1, col2) {
  return cppFuncWrapper(EigenPCA, 'error', 'num', 
                        [new ArgColumn(col1, 'f32'), new ArgColumn(col2, 'f32')] );
}

// Principal Component Analysis with approximation
function pcaWithoutApporx(columns, numOfComponents, principalComponents) {

    // create arguments
    let argData = new ArgColumns(columns, 'f32');
    let argNumComp = new Arg(numOfComponents);
    let argPComp = new ArgNewColumns('f32', columns[0].length, numOfComponents);    
    let args = [argData, argNumComp, argPComp];

    // call exported function
    let result = cppFuncWrapper(EigenPCA, 'principalComponentAnalysis', 'num', args);    

    // complete output: principalComponents
    for(let col of argPComp.data)
      principalComponents.push(col); 

    return result;
  }

//name: pca
//input: dataframe df
export function pca(df) { 
  
  let dlg = ui.dialog('Principal Component Analysis');
  
  let colsInput = ui.columnsInput('Select columns', df);    
  dlg.add(colsInput);
  let numOfCompInput = ui.intInput('Number of components', 1);
  dlg.add(numOfCompInput);
  dlg.addButton('Compute', () => {

    let columns = [];
    let principalComponents = [];    
    let numOfComponents = numOfCompInput.value;

    // complete a list of numerical columns
    for(let col of colsInput.value)
      if(col.type == 'double' || col.type == 'int')
        columns.push(col);
    
    // check sizes
    if(numOfComponents > columns.length) {
      grok.shell.error('Number of principal components must be less of equal the number of columns!');
      dlg.close();
      return;
    }

    // PCA
    grok.shell.info('Computing ...');

    let resultCode = pcaWithoutApporx(columns, numOfComponents, principalComponents);    

    // create dataframes with principal components and approximation if computation is successful
    if(resultCode == 0) {    
      grok.shell.info('Done!');

      // change names of columns
      for(let i = 0; i < numOfComponents; i++)
        principalComponents[i].name = `Comp. ${i + 1}`;
    
      // create table with principal components
      let tableWithPrincComp = DG.DataFrame.fromColumns(principalComponents);  
      tableWithPrincComp.name = `Principal Components for ${df.name}`;
      grok.shell.addTableView(tableWithPrincComp);
    }
    else
      grok.shell.error(`PCA compation fail! Result code: ${resultCode}`);

    dlg.close();
  });  

  dlg.show(); 
}
