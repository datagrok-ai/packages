import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { argv } from 'process';

function analyzeTestFunctionCalls(fileName: string): Map<string, Set<string>> | null {
    const program = ts.createProgram([fileName], {});
    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) {
        console.error(`Error: Unable to parse the file: ${fileName}`);
        return null;
    }

    const typeChecker = program.getTypeChecker();
    const methodCalls: { className: string; methodName: string }[] = [];

    function walk(node: ts.Node): void {
        if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === "test"
        ) {
            const [testName, testFunction] = node.arguments;
            if (testFunction && (ts.isArrowFunction(testFunction) || ts.isFunctionExpression(testFunction)) && testFunction.body)
                analyzeFunctionBody(testFunction.body);
        }
        ts.forEachChild(node, walk);
    }

    function analyzeFunctionBody(body: ts.Node) {
        function extractMethodCalls(node: ts.Node): void {
            if (
                ts.isCallExpression(node) &&
                ts.isPropertyAccessExpression(node.expression)
            ) {
                const expression = node.expression;
                const methodName = expression.name.text;
                const classData = getClassName(expression.expression);
                for (let className of classData.split('|')) {
                    className = className.trim();
                    if (className.indexOf('typeof') != -1)
                        className = className.split(' ')[1] ?? className;
                    if (className.indexOf('<') != -1)
                        className = className.split('<')[0];
                    className = className.trim();
                    methodCalls.push({ className, methodName });
                }
            }

            ts.forEachChild(node, extractMethodCalls);
        }

        extractMethodCalls(body);
    }

    function getClassName(node: ts.Expression): string {
        const symbol = typeChecker.getSymbolAtLocation(node);
        if (symbol) {
            const type = typeChecker.getTypeOfSymbolAtLocation(symbol, node);
            if (type) {
                const typeName = typeChecker.typeToString(type);
                return typeName || "Unknown";
            }
        }
        return "Unknown";
    }

    walk(sourceFile);

    let resultMap = new Map<string, Set<string>>();
    methodCalls.forEach(({ className, methodName }) => {

        if (!resultMap.has(className))
            resultMap.set(className, new Set<string>());

        if (!resultMap.get(className)?.has(methodName))
            resultMap.get(className)!.add(methodName);
    });
    return resultMap;
}

function getDirectoriesList(directoryPath: string): string[] {
    return fs
        .readdirSync(directoryPath, { withFileTypes: true })
        .filter(direct => direct.isDirectory())
        .map(direct => direct.name);
}

function getFilesFullpathesByFormat(directoryPath: string, fileRegex: RegExp): string[] {
    let fileList: string[] = [];
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);
        if (entry.name === 'node_modules')
            continue;
        if (entry.isDirectory())
            fileList = fileList.concat(getFilesFullpathesByFormat(fullPath, fileRegex));
        else if (fileRegex.test(entry.name))
            fileList.push(fullPath);
    }
    return fileList;
}

function getTestedMethods(packagesDir: string) {
    let resultMap = new Map<string, Set<string>>();
    let packageNames = getDirectoriesList(packagesDir);

    for (let packageName of packageNames) {
        let filePath = `${packagesDir}\\${packageName}\\src`;
        if (!fs.existsSync(filePath))
            continue;
        let fileList = getFilesFullpathesByFormat(filePath, /\.ts$/);

        for (let file of fileList) {
            let analyzedFile = analyzeTestFunctionCalls(file);

            if (analyzedFile) {
                for (let [className, functionNames] of analyzedFile) {
                    if (!resultMap.has(className)) {
                        resultMap.set(className, functionNames);
                        continue;
                    }

                    let resultFunctionNameSet = resultMap.get(className);
                    if (resultFunctionNameSet)
                        resultMap.set(className, new Set([...resultFunctionNameSet, ...functionNames]));
                }
            }
        }
    }
    return resultMap;
}

function parseFile(filePath: string) {
    const sourceCode = fs.readFileSync(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);

    const functions: { name: string; parent: string | null }[] = [];

    function visit(node: ts.Node, parentName: string | null = null) {
        if (ts.isFunctionDeclaration(node) && node.name) {
            functions.push({ name: node.name.text, parent: null });
        }
        else if (ts.isMethodDeclaration(node) && node.name) {
            if (ts.isIdentifier(node.name))
                functions.push({ name: node.name.text, parent: parentName });
        }
        else if (ts.isModuleDeclaration(node) || ts.isClassDeclaration(node)) {
            let newParentName = parentName;
            if (node.name && ts.isIdentifier(node.name))
                newParentName = node.name.text;
            node.forEachChild(child => visit(child, newParentName));
        }
    }

    sourceFile.forEachChild(visit);
    return functions;
}

function parseApi(apiDir: string) {
    let apiFiles = getFilesFullpathesByFormat(apiDir, /\.d\.ts$/);
    let results: object[] = [];
    for (let file of apiFiles) {
        let parsingResults = parseFile(file);
        results = [...results, ...parsingResults]
    }
    return results;
}

function checkApiTestCovering(apiDir: string, packagesDir: string) {
    let testedFunctions = getTestedMethods(packages);
    let apiMethods: any[] = parseApi(api);
    let csvResult = 'class/namespace, name, exists\n';

    for (let method of apiMethods) {
        let exists = false;
        if (testedFunctions.get(method.parent) && testedFunctions.get(method.parent)?.has(method.name))
            exists = true;
        csvResult = `${csvResult}${method.parent}, ${method.name}, ${exists.toString()}\n`
    }
    fs.writeFileSync('./test-covering.csv', csvResult)
}

const packages = argv[2];
const api =  argv[3];
checkApiTestCovering(api, packages);