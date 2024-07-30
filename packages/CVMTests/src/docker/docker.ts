import * as grok from 'datagrok-api/grok';
import {delay, category, expect, test, expectObject, expectExceptionAsync} from '@datagrok-libraries/utils/src/test';

category('Packages: Docker', () => {
  const containerOnDemandName: string = 'Cvmtests-docker-test1';
  const containerSimple: string = 'Cvmtests-docker-test2';

  test('Get response: On demand', async () => {
    const container = await grok.dapi.docker.dockerContainers.filter(containerOnDemandName).first();
    if (!container.status.startsWith('stopped'))
      await grok.dapi.docker.dockerContainers.stop(container.id, true);
    await testResponse(container.id);
  }, {timeout: 60000, stressTest: true});

  test('Get response: Incorrect', async () => {
    const incorrectId = crypto.randomUUID();
    let response = await grok.dapi.docker.dockerContainers.fetchProxy(incorrectId, '/square?number=4');
    // container not found
    expect(response.status, 404);
    const container = await grok.dapi.docker.dockerContainers.filter(containerSimple).first();
    response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id, '/foo?number=4');
    // response from docker with 404 - no such path mapping
    expect(response.status, 404);
    response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id, '/square?number=-0.01244');
    // response from docker
    expect(response.status, 500);
    await grok.dapi.docker.dockerContainers.stop(container.id, true);
    response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id, '/square?number=4');
    // response from server, container status is stopped
    expect(response.status, 400);
    await grok.dapi.docker.dockerContainers.run(container.id);
  }, {timeout: 60000, stressTest: true});

  test('Container timeout', async () => {
    let container = await grok.dapi.docker.dockerContainers.filter(containerOnDemandName).first();
    await grok.dapi.docker.dockerContainers.run(container.id, true);
    await delay(70000);
    container = await grok.dapi.docker.dockerContainers.filter(containerOnDemandName).first();
    expect(container.status.startsWith('stopped'), true);
  }, {timeout: 120000, stressTest: true});

  test('Get container logs: Incorrect', async () => {
    const incorrectId = crypto.randomUUID();
    await expectExceptionAsync(async () => {
      await grok.dapi.docker.dockerContainers.getContainerLogs(incorrectId);
    });
    const container = await grok.dapi.docker.dockerContainers.filter(containerSimple).first();
    if (!container.status.startsWith('stopped'))
      await grok.dapi.docker.dockerContainers.stop(container.id, true);
    await expectExceptionAsync(async () => {
      await grok.dapi.docker.dockerContainers.getContainerLogs(incorrectId);
    });
  }, {stressTest: true});
});

async function testResponse(containerId: string): Promise<void> {
  const path = '/square?number=4';
  const response = await grok.dapi.docker.dockerContainers.fetchProxy(containerId, path);
  expect(response.status, 200, `Container response status was ${response.status}`);
  const result: { [key: string]: any } = await response.json() as { [key: string]: any };
  expectObject(result, {"result": 16});
}
