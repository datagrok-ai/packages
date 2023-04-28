import fs from 'fs';
import path from 'path';
import walk from 'ignore-walk';
import * as utils from '../utils/utils';
import * as color from '../utils/color-utils';
import { FuncMetadata, FuncParam, FuncValidator, ValidationResult } from '../utils/interfaces';
import { PackageFile } from '../utils/interfaces';


export function check(args: CheckArgs): boolean {
  const nOptions = Object.keys(args).length - 1;
  if (args['_'].length !== 1 || nOptions > 2 || (nOptions > 0 && !args.r && !args.recursive))
    return false;

  const curDir = process.cwd();

  if (args.recursive) {
    function runChecksRec(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
          if (utils.isPackageDir(filepath))
            runChecks(filepath);
          else {
            if (file !== 'node_modules' && !file.startsWith('.'))
              runChecksRec(path.join(dir, file));
          }
        }
      }
    }
    runChecksRec(curDir);
  } else {
    if (!utils.isPackageDir(curDir)) {
      color.error('File `package.json` not found. Run the command from the package directory');
      return false;
    }

    runChecks(curDir);
  }

  function runChecks(packagePath: string) {
    const files = walk.sync({ path: packagePath, ignoreFiles: ['.npmignore', '.gitignore'] });
    const jsTsFiles = files.filter((f) => !f.startsWith('dist/') && (f.endsWith('.js') || f.endsWith('.ts')));
    const packageFiles = ['src/package.ts', 'src/detectors.ts', 'src/package.js', 'src/detectors.js',
      'src/package-test.ts', 'src/package-test.js', 'package.js', 'detectors.js'];
    const funcFiles = jsTsFiles.filter((f) => packageFiles.includes(f));
    const warnings: string[] = [];

    const webpackConfigPath = path.join(packagePath, 'webpack.config.js');
    const isWebpack = fs.existsSync(webpackConfigPath);
    let externals: { [key: string]: string } | null = null;
    if (isWebpack) {
      const content = fs.readFileSync(webpackConfigPath, { encoding: 'utf-8' });
      externals = extractExternals(content);
      if (externals)
        warnings.push(...checkImportStatements(packagePath, jsTsFiles, externals));
    }

    warnings.push(...checkFuncSignatures(packagePath, funcFiles));
    warnings.push(...checkPackageFile(packagePath, { isWebpack, externals }));

    if (warnings.length) {
      console.log(`Checking package ${path.basename(packagePath)}...`);
      warn(warnings);
    } else
      console.log(`Checking package ${path.basename(packagePath)}...\t\t\t\u2713 OK`);
  }

  return true;
}

export function extractExternals(config: string): {}|null {
  const externalsRegex = /(?<=externals)\s*:\s*(\{[\S\s]*?\})/;
  const match = config.match(externalsRegex);
  if (match) {
    // Replace single quotes, comments, and a trailing comma to make a string JSON-like
    const externalStr = match[1]
      .replace(/'/g, '"')
      .replace(/\/\/.*(\r\n|\r|\n)/, '')
      .replace(/(?<=[\S\s]),(?=\s*\})/, '');
    try {
      const externals = JSON.parse(externalStr);
      return externals;
    } catch(e) {
      return null;
    }
  }
  return null;
}

export function checkImportStatements(packagePath: string, files: string[], externals: {}): string[] {
  const modules = [];
  for (const key in externals) {
    modules.push(key);
    if (key.includes('/'))
      modules.push(key.split('/', 1)[0]);
  }
  const importRegex = new RegExp(`^(?!\\/{2})\\s*import\\s+.*(${modules.join('|')}).*(?=\\s+?)`, 'g');
  const validImportRegex = new RegExp(`import\\s+.*(${Object.keys(externals).join('|')})['"]{1}`);
  const warnings: string[] = [];

  function validateImport(file: string, s: string): ValidationResult {
    let value = validImportRegex.test(s);
    let message = value ? '' : 'Pay attention to file ' + file + ': import statement `' +
      s + '` differs from the path given in the webpack config as an external module. ' +
      'It can increase the bundle size.';
    return { value, message };
  }

  for (const file of files) {
    const content = fs.readFileSync(path.join(packagePath, file), { encoding: 'utf-8' });
    const matchedImports = content.match(importRegex);
    if (matchedImports) {
      for (const match of matchedImports) {
        const vr = validateImport(file, match);
        if (!vr.value)
          warnings.push(vr.message);
      }
    }
  }

  return warnings;
}

export function checkFuncSignatures(packagePath: string, files: string[]): string[] {
  const warnings: string[] = [];
  const checkFunctions: { [role: string]: FuncValidator } = {
    app: ({name}: {name?: string}) => {
      let value = true;
      let message = '';

      if (name && typeof name === 'string') {
        const lowerCaseName = name.toLocaleLowerCase();
        if (lowerCaseName.startsWith('app')) {
          value = false;
          message += 'Prefix "App" is not needed. Consider removing it.\n';
        }
        if (lowerCaseName.endsWith('app')) {
          value = false;
          message += 'Postfix "App" is not needed. Consider removing it.\n';
        }
      }

      return { value, message };
    },
    semTypeDetector: ({inputs, outputs}: {inputs: FuncParam[], outputs: FuncParam[]}) => {
      let value = true;
      let message = '';

      if (inputs.length !== 1 || inputs[0].type !== 'column') {
        value = false;
        message += 'Semantic type detectors must have one input of type "column"\n';
      }

      if (outputs.length !== 1 || outputs[0].type !== 'string') {
        value = false;
        message += 'Semantic type detectors must have one output of type "string"\n';
      }

      return { value, message };
    },
    cellRenderer: ({inputs, outputs}: {inputs: FuncParam[], outputs: FuncParam[]}) => {
      let value = true;
      let message = '';

      if (inputs.length !== 0) {
        value = false;
        message += 'Cell renderer functions should take no arguments\n';
      }

      if (outputs.length !== 1 || outputs[0].type !== 'grid_cell_renderer') {
        value = false;
        message += 'Cell renderer functions must have one output of type "grid_cell_renderer"\n';
      }

      return { value, message };
    },
    viewer: ({inputs, outputs}: {inputs: FuncParam[], outputs: FuncParam[]}) => {
      let value = true;
      let message = '';

      if (inputs.length !== 0) {
        value = false;
        message += 'Viewer functions should take no arguments\n';
      }

      if (outputs.length > 1 || (outputs.length === 1 && outputs[0].type !== 'viewer')) {
        value = false;
        message += 'Viewers must have one output of type "viewer"\n';
      }

      return { value, message };
    },
    fileViewer: ({inputs, outputs, tags}: {inputs: FuncParam[], outputs: FuncParam[], tags?: string[]}) => {
      let value = true;
      let message = '';

      if (tags == null || tags.filter((t) => t.startsWith('fileViewer')).length < 2) {
        value = false;
        message += 'File viewers must have at least two special tags: "fileViewer" and "fileViewer-<extension>"\n';
      }

      if (inputs.length !== 1 || inputs[0].type !== 'file') {
        value = false;
        message += 'File viewers must have one input of type "file"\n';
      }

      if (outputs.length !== 1 || outputs[0].type !== 'view') {
        value = false;
        message += 'File viewers must have one output of type "view"\n';
      }

      return { value, message };
    },
    fileExporter: ({description}: {description?: string}) => {
      let value = true;
      let message = '';

      if (description == null || description === '') {
        value = false;
        message += 'File exporters should have a description parameter\n';
      }

      return { value, message };
    },
    packageSettingsEditor: ({outputs}: {outputs: FuncParam[]}) => {
      let value = true;
      let message = '';

      if (outputs.length === 1 && outputs[0].type === 'widget') {
        value = false;
        message += 'Package settings editors must have one output of type "widget"\n';
      }

      return { value, message };
    },
  };
  const functionRoles = Object.keys(checkFunctions);

  for (const file of files) {
    const content = fs.readFileSync(path.join(packagePath, file), { encoding: 'utf-8' });
    const functions = getFuncMetadata(content);
    for (const f of functions) {
      const roles = functionRoles.filter((role) => f.tags?.includes(role));
      if (roles.length > 1) {
        warnings.push(`File ${file}, function ${f.name}: several function roles are used (${roles.join(', ')})`);
      } else if (roles.length === 1) {
        const vr = checkFunctions[roles[0]](f);
        if (!vr.value)
          warnings.push(`File ${file}, function ${f.name}:\n${vr.message}`);
      }
    }
  }

  return warnings;
}

const sharedLibExternals: {[lib: string]: {}} = {
  'common/html2canvas.min.js': { 'exceljs': 'ExcelJS' },
  'common/exceljs.min.js': { 'html2canvas': 'html2canvas' },
  'common/ngl_viewer/ngl.js': { 'NGL': 'NGL' },
  'common/openchemlib-full.js': { 'openchemlib/full': 'OCL' },
  'common/codemirror/codemirror.js': { 'codemirror': 'CodeMirror' },
};

export function checkPackageFile(packagePath: string, options?: { externals?:
  { [key: string]: string } | null, isWebpack?: boolean }): string[] {
  const warnings: string[] = [];
  const packageFilePath = path.join(packagePath, 'package.json');
  const json: PackageFile = JSON.parse(fs.readFileSync(packageFilePath, { encoding: 'utf-8' }));
  const isPublicPackage = path.basename(path.dirname(packagePath)) === 'packages' &&
    path.basename(path.dirname(path.dirname(packagePath))) === 'public';

  if (!json.description)
    warnings.push('File "package.json": "description" field is empty. Provide a package description.');

  if (Array.isArray(json.properties) && json.properties.length > 0) {
    for (const propInfo of json.properties) {
      if (typeof propInfo !== 'object')
        warnings.push('File "package.json": Invalid property annotation in the "properties" field.');
      else if (!propInfo.name)
        warnings.push('File "package.json": Add a property name for each property in the "properties" field.');
      else if (!utils.propertyTypes.includes(propInfo.propertyType))
        warnings.push(`File "package.json": Invalid property type for property ${propInfo.name}.`);
    }
  }

  if (json.repository == null && isPublicPackage)
    warnings.push('File "package.json": add the "repository" field.');

  if (json.author == null && isPublicPackage)
    warnings.push('File "package.json": add the "author" field.');

  if (Array.isArray(json.sources) && json.sources.length > 0) {
    for (const source of json.sources) {
      if (typeof source !== 'string')
        warnings.push(`File "package.json": Only file paths and URLs are allowed in sources. Modify the source ${source}`);
      if (utils.absUrlRegex.test(source))
        continue;
      if (source.startsWith('common/')) {
        if (options?.isWebpack && source.endsWith('.js')) {
          if (options?.externals) {
            if (source in sharedLibExternals) {
              const [lib, name] = Object.entries(sharedLibExternals[source])[0];
              if (!(lib in options.externals && options.externals[lib] === name)) {
                warnings.push(`Webpack config parsing: Consider adding source "${source}" to webpack externals:\n` +
                  `'${lib}': '${name}'\n`);
              }
            } else {
              warnings.push(`File "package.json": source "${source}" not in the list of shared libraries`);
            }
          } else {
            warnings.push('Webpack config parsing: External modules not found.\n' +
              `Consider adding source "${source}" to webpack externals` + (source in sharedLibExternals ? ':\n' +
              `'${Object.keys(sharedLibExternals[source])[0]}': '${Object.values(sharedLibExternals[source])[0]}'\n` : ''));
          }
        }
        continue;
      }
      if (source.startsWith('src/') && fs.existsSync(path.join(packagePath, 'webpack.config.js')))
        warnings.push('File "package.json": Sources cannot include files from the \`src/\` directory. ' +
          `Move file ${source} to another folder.`);
      if (!(fs.existsSync(path.join(packagePath, source))))
        warnings.push(`Source ${source} not found in the package.`);
    }
  }

  return warnings;
}

function warn(warnings: string[]): void {
  warnings.forEach((w) => color.warn(w));
}

function getFuncMetadata(script: string): FuncMetadata[] {
  const funcData: FuncMetadata[] = [];
  let isHeader = false;
  let data: FuncMetadata = { name: '', inputs: [], outputs: [] };

  for (const line of script.split('\n')) {
    if (!line)
      continue;

    const match = line.match(utils.paramRegex);
    if (match) {
      if (!isHeader)
        isHeader = true;
      const param = match[1];
      if (param === 'name')
        data.name = match[2];
      else if (param === 'description')
        data.description = match[2];
      else if (param === 'input')
        data.inputs.push({ type: match[2] });
      else if (param === 'output')
        data.outputs.push({ type: match[2] });
      else if (param === 'tags')
        data.tags = match.input && match[3] ? match.input.split(':')[1].split(',').map((t) => t.trim()) : [match[2]];
    }
    if (isHeader) {
      const nm = line.match(utils.nameRegex);
      if (nm && !line.match(utils.paramRegex)) {
        data.name = data.name || nm[1];
        funcData.push(data);
        data = { name: '', inputs: [], outputs: [] };
        isHeader = false;
      }
    }
  }

  return funcData;
}

interface CheckArgs {
  _: string[],
  r?: boolean,
  recursive?: boolean,
}
