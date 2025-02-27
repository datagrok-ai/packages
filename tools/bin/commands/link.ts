
/* eslint-disable valid-jsdoc */
import fs from 'fs';
import path from 'path';
import { runScript } from '../utils/utils';

const repositoryDirNameRegex = new RegExp(path.join('1', '2')[1] + 'public$');

const curDir = process.cwd();
let devMode = false;
let repositoryDir = curDir;
let localPackageDependencies: PackageData[];
let packagesToLink: Set<string>;
while (path.dirname(repositoryDir) !== repositoryDir) {
  if (repositoryDirNameRegex.test(repositoryDir))
    break;
  repositoryDir = path.dirname(repositoryDir);
}

const apiDir = path.join(repositoryDir, 'js-api');
const libDir = path.join(repositoryDir, 'libraries');
const packageDir = path.join(repositoryDir, 'packages');

const apiPackageName = 'datagrok-api';
const libName = '@datagrok-libraries/';
const packageName = '@datagrok/';

export async function link(args: LinkArgs) {
  localPackageDependencies = []
  packagesToLink = new Set<string>();
  if (args.dev !== undefined)
    devMode = args.dev;
  collectPackagesData(curDir);
  await linkPackages();

  console.log('Package linked')
  return true;
}

function collectPackagesData(packagePath: string = curDir): string[] {
  const packageJsonPath = path.join(packagePath, 'package.json');
  if (!fs.existsSync(packageJsonPath))
    return [];
  const json = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  let result: string[] = [];
  result = result.concat(collectPacakgeDataFromJsonObject(json.dependencies));
  if (devMode)
    result = result.concat(collectPacakgeDataFromJsonObject(json.devDependencies));
  return result;
}

function collectPacakgeDataFromJsonObject(object: any): string[] {
  let result: string[] = [];
  for (let dependencyName of Object.keys(object)) {
    let nameSplitted = dependencyName.split('/');
    if (dependencyName === apiPackageName)
      result = result.concat(parsePackageDependencies(dependencyName, apiDir));
    else if (dependencyName.includes(libName))
      result = result.concat(parsePackageDependencies(dependencyName, path.join(libDir, nameSplitted[nameSplitted.length - 1])));
    else if (dependencyName.includes(packageName))
      result = result.concat(parsePackageDependencies(dependencyName, path.join(packageDir, toCamelCase(nameSplitted[nameSplitted.length - 1]))));
  }
  return result;
}

function toCamelCase(input: string): string {
  return input
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function parsePackageDependencies(dependencyName: string, pathToLink: string): string[] {
  let result: string[] = [];
  if (!packagesToLink.has(dependencyName)) {
    packagesToLink.add(dependencyName);
    localPackageDependencies.push(new PackageData(dependencyName, pathToLink));
  }
  result.push(dependencyName);
  return result;
}


async function linkPackages() {
  let anyChanges = true;

  while (anyChanges && packagesToLink.size > 0) {
    anyChanges = false;
    let mapElements = localPackageDependencies.filter(x => x.dependencies.every(i => !packagesToLink.has(i)) && packagesToLink.has(x.name));

    for (let element of mapElements) {
      await runScript(`npm install`, element.packagePath);
      await runScript(`npm link ${element.dependencies.join(' ')}`, element.packagePath);
      await runScript(`npm link`, element.packagePath);
      packagesToLink.delete(element.name);
      anyChanges = true;
    }

    if (anyChanges === false)
      throw (new Error(`There is loop with next packages: ${JSON.stringify(Array.from(packagesToLink)).toString()}`));
  }

  let names = localPackageDependencies.map(x => x.name);
  await runScript(`npm install`, curDir);
  await runScript(`npm link ${names.join(' ')}`, curDir);
}

class PackageData {
  name: string;
  packagePath: string;
  dependencies: string[] = [];

  constructor(name: string, packagePath: string) {
    this.name = name;
    this.packagePath = packagePath;
    this.dependencies = collectPackagesData(packagePath);
  }
}

interface LinkArgs {
  local?: boolean,
  npm?: boolean,
  dev?: boolean,
}