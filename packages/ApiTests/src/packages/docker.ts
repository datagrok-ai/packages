import * as grok from 'datagrok-api/grok';
import {category, expect, expectObject, test} from '@datagrok-libraries/utils/src/test';

category('Packages: Docker', () => {
  const containerName: string = 'Apitests-docker-test1';

  test('Get response', async () => {
    const container = await grok.dapi.docker.dockerContainers.filter(containerName).first();
    if (container.status !== 'started' && container.status !== 'checking')
      await grok.dapi.docker.dockerContainers.run(container.id, true);
    await testResponse(container.id);
  }, {timeout: 30000, stressTest: true});

  test('Get build logs', async () => {
    const image = await grok.dapi.docker.dockerImages.filter(containerName).first();
    expect(image.status === 'ready');
    expect(!image.logs || image.logs.length === 0, false);
  }, {stressTest: true});

  test('Get container logs', async () => {
    const container = await grok.dapi.docker.dockerContainers.filter(containerName).first();
    if (container.status !== 'started' && container.status !== 'checking')
      await grok.dapi.docker.dockerContainers.run(container.id, true);
    const logs = await grok.dapi.docker.dockerContainers.getContainerLogs(container.id);
    expect(!logs || logs.length === 0, false);
  }, {stressTest: true});
});

async function testResponse(containerId: string): Promise<void> {
  const path = '/square?number=4';
  const response = await grok.dapi.docker.dockerContainers.fetchProxy(containerId, path);
  expect(response.status, 200, `Container response status was ${response.status}`);
  const result: { [key: string]: any } = await response.json() as { [key: string]: any };
  expectObject(result, {"result": 16});
}
