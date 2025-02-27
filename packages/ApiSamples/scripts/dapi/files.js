//help-url: https://datagrok.ai/help/develop/how-to/access-data
// JS API methods for working with files

(async () => {

  let res = null;

  // Write files
  await grok.dapi.files.write('System:AppData/Samples/testFile.dat', [0, 1, 2]);
  await grok.dapi.files.writeAsText('System:AppData/Samples/testFile.txt', 'testString');

  // Rename
  await grok.dapi.files.writeAsText('System:AppData/Samples/forRename.txt', 'testString');
  await grok.dapi.files.rename('System:AppData/Samples/forRename.txt', 'renamed.txt');

  // Read files
  res = await grok.dapi.files.readAsBytes('System:AppData/Samples/testFile.dat');
  console.log(`readAsBytes: ${res}`);
  res = await grok.dapi.files.readAsText('System:AppData/Samples/testFile.txt');
  console.log(`readAsText: ${res}`);
  res = await grok.dapi.files.exists('System:AppData/Samples/testFile.dat');
  console.log(`testFile.dat exists: ${res}`);

  // Search files
  let recursive = true;
  let searchPattern = 'test';
  res = await grok.dapi.files.list('System:AppData/Samples/', recursive, searchPattern);
  console.log(`list: ${res}`);

  //Create Directory
  await grok.dapi.files.createDirectory('System:AppData/Samples/geo')
  
  // Move files 
  await grok.dapi.files.move(['System:AppData/Samples/testFile.txt'], 'Samples/geo');
  res = await grok.dapi.files.exists('System:AppData/Samples/geo/testFile.txt');
  console.log(`testFile.txt was moved to geo: ${res}`);

  //Remove Directory
  await grok.dapi.files.delete('System:AppData/Samples/geo')
  
  // Delete files
  await grok.dapi.files.delete('System:AppData/Samples/geo/testFile.txt');
  await grok.dapi.files.delete('System:AppData/Samples/testFile.dat');
  await grok.dapi.files.delete('System:AppData/Samples/renamed.txt');
})();
