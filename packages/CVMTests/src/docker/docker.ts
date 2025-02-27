import * as grok from 'datagrok-api/grok';
import * as DG from 'datagrok-api/dg';
import {
  delay,
  category,
  expect,
  test,
  expectObject,
  expectExceptionAsync,
  before
} from '@datagrok-libraries/utils/src/test';

category('Docker', () => {
  const containerOnDemandName: string = 'Cvmtests-docker-test1';
  const containerSimple: string = 'Cvmtests-docker-test2';
  const incorrectId: string = '00000000-0000-0000-0000-000000000000';

  before(async () => {
    await stopContainer(containerOnDemandName);
    await startContainer(containerSimple);
  });

  test('Get response: On demand', async () => {
    const container = await stopContainer(containerOnDemandName);
    await testResponse(container.id);
  }, {timeout: 240000, /*stressTest: true*/});

  test('Container timeout', async () => {
    let container = await stopContainer(containerOnDemandName);
    await grok.dapi.docker.dockerContainers.run(container.id, true);
    await delay(90000);
    container = await grok.dapi.docker.dockerContainers.filter(containerOnDemandName).first();
    expect(container.status.startsWith('stop'), true);
  }, {timeout: 240000, /*stressTest: true*/});

  test('Get response and logs: Incorrect', async () => {
    let response = await grok.dapi.docker.dockerContainers.fetchProxy(incorrectId, '/square?number=4');
    // container not found
    expect(response.status, 404, 'Status should be 404 indicating that container doesn\'t exist');
    const container = await startContainer(containerSimple);
    try {
      response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id, '/foo?number=4');
      // response from docker with 404 - no such path mapping
      expect(response.status, 404, 'Status should be 404 indicating that in container there is not mapping for this url');
      response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id, '/square?number=-0.01244');
      // response from docker
      expect(response.status, 500, 'Status should be 500 indicating that something went wrong in container');
      await grok.dapi.docker.dockerContainers.stop(container.id, true);
      response = await grok.dapi.docker.dockerContainers.fetchProxy(container.id, '/square?number=4');
      // response from server, container status is stopped
      expect(response.status, 400, 'Status should be 400 indicating that container is stopped and it is bad request');

      // requesting logs of container with incorrect id
      await expectExceptionAsync(async () => {
        await grok.dapi.docker.dockerContainers.getContainerLogs(incorrectId);
      });
    } finally {
      grok.dapi.docker.dockerContainers.run(container.id).then((_) => {}).catch((_) => {});
    }
  }, {timeout: 240000, /*stressTest: true*/});
});

async function stopContainer(containerName: string): Promise<DG.DockerContainer> {
  const container = await grok.dapi.docker.dockerContainers.filter(containerName).first();
  //@ts-ignore
  if (!container.status.startsWith('stopped') && !(container.status.startsWith('pending') || container.status === 'stopping'))
    await grok.dapi.docker.dockerContainers.stop(container.id, true);
  return container;
}

async function startContainer(containerName: string): Promise<DG.DockerContainer> {
  const container = await grok.dapi.docker.dockerContainers.filter(containerName).first();
  if (container.status.startsWith('stopped'))
    await grok.dapi.docker.dockerContainers.run(container.id, true);
  return container;
}

async function testResponse(containerId: string): Promise<void> {
  const path = '/square?number=4';
  const response = await grok.dapi.docker.dockerContainers.fetchProxy(containerId, path);
  const body = await response.json();
  expect(response.status, 200, `Response status was ${response.status}, responded with: ${body['datagrok-error']}`);
  expectObject(body, {"result": 16});
}
