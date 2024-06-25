import fs from 'fs';
import path from 'path';
import { argv } from 'process';
import * as dotenv from 'dotenv';
dotenv.config();
const baseProjectDirectoryPathConst = '../js-api/';
const outputDirConst = './static/versions/';
const baseProjectDirectoryPath: string | undefined = process.env.baseProjectDirectoryPath || baseProjectDirectoryPathConst
const outputDir: string | undefined = process.env.outputDir || outputDirConst

const spacesAmount = 2;

const vesionsFile = 'versions.json';
const newVersion = argv[2];

interface IIndexable {
    [key: string]: any;
}
interface IData {
    versions: string[];
}

class ProjectDGFunctionsParser {
    private functionRegex = new RegExp("\\s*(?:function\\s+)?(\\w+)\\s*\\(([^)]*)\\)\\s*:\\s*([^\\{\\;]*)\\s*\\{?;?\\s*$");
    private getAccessorRegex = new RegExp("\\s*get\\s+([^\\(]*)\\s*\\(\\)\\s*:\\s*([^\\{\\;]*)\\s*");
    private setAccessorRegex = new RegExp("\\s*set\\s+([^\\(]*)\\s*\\(([^\\)]*)\\)");
    private nonPublicRegex = new RegExp("\\s*((private)|(protected))\\s+");

    private functionPart1Regex = new RegExp("\\s*(?:function\\s+)?(\\w+)\\s*\\(([^)]*)$");
    private functionPart2Regex = new RegExp("^[^)]*$");
    private functionPart3Regex = new RegExp("^[^)]*\\)\\s*:\\s*([^\\{\\;]*)\\s*\\{?;?\\s*$");

    private asyncRegex = new RegExp("\\s*async\\s+");
    private staticRegex = new RegExp("\\s*static\\s+");

    private isAsync = false;
    private isStatic = false;

    private concatedString = "";
    private wasConcatedString = false;

    private containerRegex = new RegExp("(?:export declare)[ ]*(?:namespace|class)[ ]*[^{|;]*(?:{|;)");
    private containerNameRegex = new RegExp("(?<=export declare (?:class|namespace) )\\w+(?=\\s*(?:extends\\s+\\w+\\s+)?[{;]?)");
    private lastClass: string | undefined = undefined;
    private resultFunctionsObject: IIndexable = {};

    public static instance: ProjectDGFunctionsParser = new ProjectDGFunctionsParser();

    private constructor() {
    }

    public GetFunctionsByDirectory(directoryPath: string): any {
        this.resultFunctionsObject = {};
        const filesList = this.GetListOfDirectories(directoryPath)
        filesList.forEach((filePath: string) => {
            this.GetMethodsFormFile(filePath);
        });
        return this.resultFunctionsObject;
    }

    private GetListOfDirectories(dirPath: string) {
        let resultDirs: string[] = []
        const files = fs.readdirSync(dirPath);

        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory() && file !== "node_modules") {
                resultDirs = resultDirs.concat(this.GetListOfDirectories(filePath));
            } else {
                if (file.includes(".d.ts") && !file.includes(".d.ts.map")) {
                    resultDirs.push(filePath);
                }
            }
        });
        return resultDirs;
    }

    private GetMethodsFormFile(filePath: string) {

        try {
            const fileLines = fs.readFileSync(filePath, 'utf8').split('\n');
            let namespaceLevel = 0;


            fileLines.forEach(line => {
                //removes extra spaces, tabulations
                let trimmedLine: string = line.split(' ').filter(word => word !== '').join(' ').split('\t').join('').trim();


                namespaceLevel += this.CountCharactersInLine(trimmedLine, '{')
                namespaceLevel -= this.CountCharactersInLine(trimmedLine, '}')

                if (this.containerRegex.test(trimmedLine)) {
                    this.lastClass = this.GetContainersName(trimmedLine);

                    if (this.lastClass) {
                        if (this.resultFunctionsObject[this.lastClass] === undefined)
                            this.resultFunctionsObject[this.lastClass] = {};
                    }
                    else
                        console.error("No class names found in the input text: " + trimmedLine);

                }
                else if (namespaceLevel >= 1) {
                    if (!this.nonPublicRegex.test(trimmedLine)) {

                        if (this.asyncRegex.test(trimmedLine))
                            this.isAsync = true;
                        if (this.staticRegex.test(trimmedLine))
                            this.isStatic = true;

                        if (this.setAccessorRegex.test(trimmedLine)) {

                            this.AddToResultSetAccessor(trimmedLine);
                            this.concatedString = "";
                            this.wasConcatedString = false;
                        }
                        else if (this.getAccessorRegex.test(trimmedLine)) {

                            this.AddToResultGetAccessor(trimmedLine);
                            this.concatedString = "";
                            this.wasConcatedString = false;
                        }
                        else if (this.functionRegex.test(trimmedLine)) {
                            let isMethod = true;
                            if (trimmedLine.indexOf('function ') !== -1) {
                                trimmedLine = trimmedLine.substring(trimmedLine.indexOf('function ') + 'function '.length).trim();
                                isMethod = false;
                            }
                            this.AddToResultFunction(trimmedLine, isMethod);
                            this.concatedString = "";
                            this.wasConcatedString = false;
                        }
                        else if (this.functionPart1Regex.test(trimmedLine)) {
                            this.concatedString = trimmedLine;
                            this.wasConcatedString = true;
                        }
                        else if (this.wasConcatedString) {
                            if (this.functionPart2Regex.test(trimmedLine)) {
                                this.concatedString = this.concatedString + " " + trimmedLine;
                            } else if (this.functionPart3Regex.test(trimmedLine)) {
                                this.concatedString = this.concatedString + " " + trimmedLine;
                                trimmedLine = this.concatedString.split(' ').filter(word => word !== '').join(' ').split('\t').join('').trim();

                                if (this.asyncRegex.test(trimmedLine))
                                    this.isAsync = true;
                                if (this.staticRegex.test(trimmedLine))
                                    this.isStatic = true;

                                if (this.setAccessorRegex.test(trimmedLine)) {
                                    if (trimmedLine.indexOf('set ') != -1) {
                                        trimmedLine = trimmedLine.substring(trimmedLine.indexOf('set ') + 'set '.length).trim();
                                    }
                                    this.AddToResultSetAccessor(trimmedLine);
                                    this.concatedString = "";
                                    this.wasConcatedString = false;
                                }
                                else if (this.functionRegex.test(trimmedLine)) {
                                    let isMethod = true;
                                    if (trimmedLine.indexOf('function ') != -1) {
                                        trimmedLine = trimmedLine.substring(trimmedLine.indexOf('function ') + 'function '.length).trim();
                                        isMethod = true;
                                    }
                                    this.AddToResultFunction(trimmedLine, isMethod);
                                    this.concatedString = "";
                                    this.wasConcatedString = false;
                                }

                                this.concatedString = "";
                                this.wasConcatedString = false;
                            }
                            else {
                                this.concatedString = "";
                                this.wasConcatedString = false;
                            }
                        }

                        this.isAsync = false;
                        this.isStatic = false;

                    }
                }
                else if (namespaceLevel == 0) {
                    this.lastClass = undefined;
                }
            });
        } catch (err) {
            console.error('Error reading the file:', err);
        }
        this.lastClass = undefined
    }

    private checkIsNamespaceExistsInOutput(className: string, functionName: string) {
        if (!this.resultFunctionsObject[className]) {
            this.resultFunctionsObject[className] = {};
        }
        if (!this.resultFunctionsObject[className][functionName]) {
            this.resultFunctionsObject[className][functionName] = {};
        }
    }

    private AddToResultGetAccessor(signature: string): void {
        const match = signature.match(this.getAccessorRegex);

        if (match && this.lastClass !== undefined) {
            const name = 'get ' + match[1];
            const returnType = match[2];

            this.checkIsNamespaceExistsInOutput(this.lastClass, name);
            this.resultFunctionsObject[this.lastClass][name]['type'] = 'get';
            this.resultFunctionsObject[this.lastClass][name]['result'] = returnType;

            if (this.isStatic)
                this.resultFunctionsObject[this.lastClass][name]['static'] = true;
            if (this.isAsync)
                this.resultFunctionsObject[this.lastClass][name]['async'] = true;
        }
    }

    private AddToResultSetAccessor(signature: string): void {
        const match = signature.match(this.setAccessorRegex);

        if (match && this.lastClass !== undefined) {
            const name = 'set ' + match[1];
            const paramsString = match[2];

            this.checkIsNamespaceExistsInOutput(this.lastClass, name);
            this.resultFunctionsObject[this.lastClass][name]['type'] = 'set';
            this.resultFunctionsObject[this.lastClass][name]['params'] = paramsString;

            if (this.isStatic)
                this.resultFunctionsObject[this.lastClass][name]['static'] = true;
            if (this.isAsync)
                this.resultFunctionsObject[this.lastClass][name]['async'] = true;
        }
    }

    private AddToResultFunction(signature: string, isMethod: boolean = false): void {
        const match = signature.match(this.functionRegex);

        if (match && this.lastClass !== undefined) {
            const name = match[1];
            const paramsString = match[2];
            const returnType = match[3];

            this.checkIsNamespaceExistsInOutput(this.lastClass, name);
            this.resultFunctionsObject[this.lastClass][name]['type'] = isMethod ? '' : 'function';
            this.resultFunctionsObject[this.lastClass][name]['params'] = paramsString;
            this.resultFunctionsObject[this.lastClass][name]['result'] = returnType;

            if (this.isStatic)
                this.resultFunctionsObject[this.lastClass][name]['static'] = true;
            if (this.isAsync)
                this.resultFunctionsObject[this.lastClass][name]['async'] = true;
        }
    }

    private GetContainersName(containerString: string): string | undefined {
        const classNames = containerString.match(this.containerNameRegex);
        return classNames![0] || undefined;
    }

    private CountCharactersInLine(line: string, char: string): number {
        let count = 0;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === char) {
                count++;
            }
        }
        return count;
    }
}

class VersionsManager {


    public static instance: VersionsManager = new VersionsManager();

    private constructor() {
    }

    public readJSONFromFile(filename: string): IData {
        try {
            const data = fs.readFileSync(filename, 'utf-8');
            return JSON.parse(data);
        } catch (err) {
            return { versions: [] };
        }
    }

    private writeJSONToFile(filename: string, newData: IData) {
        fs.writeFileSync(filename, JSON.stringify(newData, null, spacesAmount));
    }

    public addNewVersion(filename: string, newVersion: string) {
        const data = this.readJSONFromFile(filename);
        data.versions.push(newVersion);
        this.writeJSONToFile(filename, data);
    }
}


function SaveObjToJsonFile(directory: string, object: any) {

    const jsonData = JSON.stringify(object);
    fs.writeFile(directory, jsonData, (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return;
        }
        console.log('File saved successfully:', directory);
    });
}

try {
    if (newVersion === '' || newVersion === undefined)
        throw new Error("set version value");

    var versions = VersionsManager.instance.readJSONFromFile(outputDir + vesionsFile);

    if (versions.versions.includes(newVersion) && argv[3] !== 'true')
        throw new Error("current version exists in version file add paramater 'true' to override it");
    if (outputDir && baseProjectDirectoryPath) {


        var functionsData = ProjectDGFunctionsParser.instance.GetFunctionsByDirectory(baseProjectDirectoryPath);
        SaveObjToJsonFile(outputDir + newVersion + ".json", functionsData);

        if (!versions.versions.includes(newVersion))
            VersionsManager.instance.addNewVersion(outputDir + vesionsFile, newVersion);
    }
}
catch (e) {
    if (e instanceof Error) {
        console.log(e.message);
    }
    else {
        console.log(e);
    }
} 