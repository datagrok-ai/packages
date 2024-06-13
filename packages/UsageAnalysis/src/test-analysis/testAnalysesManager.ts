import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import { delay, Test, TestContext, initAutoTests, awaitCheck } from '@datagrok-libraries/utils/src/test';
 
import { getDate } from '../utils';


interface IPackageTest {
    test: Test,
    packageName: string
}

export class TestAnalysesManager {
    private testsListMapped: any[] = [];

    constructor(){
    }

    public async init(){ 
        let testsList = await TestAnalysesManager.collectTests();

        this.testsListMapped = testsList.map((elem) => {
            return { 'name': elem.packageName + ": " + elem.test.category + ": " + elem.test.name  };
        });
    }

    public async getTestsStatusesByLastCommit() : Promise<DG.DataFrame>{
        let currentDate = getDate(new Date(Date.now()));  
 
        let testsListDF = DG.DataFrame.fromObjects(this.testsListMapped); 

        const runs: DG.DataFrame = await grok.functions.call('UsageAnalysis:getServerStartsFor2Weeks',  { 'date': currentDate });
        let commitBuildTime : any = Array.from(runs.rows)[0]['buildtime']; 
        let commitBuildDate = getDate(new  Date(commitBuildTime));
        const tests: DG.DataFrame = await grok.functions.call('UsageAnalysis:getTestStatusesInTimespan',  { 'startDate': commitBuildDate, 'endDate' : currentDate, 'testslist': testsListDF });
        return tests;
    }


    static async collectPackages(packageName?: string): Promise<any[]> {
        let testFunctions = DG.Func.find({ name: 'Test', meta: { file: 'package-test.js' } });
        testFunctions = testFunctions.sort((a, b) => a.package.friendlyName.localeCompare(b.package.friendlyName));
        if (packageName) testFunctions = testFunctions.filter((f: DG.Func) => f.package.name === packageName);
        return testFunctions;
    }

    static async collectTests(): Promise<IPackageTest[]> {
        let packagesTests = await this.collectPackages();
        let testsData: IPackageTest[] = [];

        for (let selectedPackage of packagesTests) {

            if (selectedPackage) {
                selectedPackage.check = true;
                await selectedPackage.package.load({ file: selectedPackage.options.file });
                const testModule = selectedPackage.package.getModule(selectedPackage.options.file);
                if (!testModule)
                    console.error(`Error getting tests from '${selectedPackage.package.name}/${selectedPackage.options.file}' module.`);
                const allPackageTests = testModule ? testModule.tests : undefined;
                if (allPackageTests) {
                    Object.keys(allPackageTests).forEach((cat) => {
                        const tests: IPackageTest[] = allPackageTests[cat].tests.map((t: any) => {
                            return { test: t, packageName: selectedPackage.package.name };
                        });
                        testsData = testsData.concat(tests);
                    });
                };
            }
        }
        return testsData;
    }
}
