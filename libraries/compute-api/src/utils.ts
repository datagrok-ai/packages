import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';
import type {
  testPipeline as testPipelineType,
} from '@datagrok-libraries/compute-utils/shared-utils/function-views-testing';

export function testPipeline(
  ...args: Parameters<typeof testPipelineType>
): ReturnType<typeof testPipelineType> {
  return window.compute.testPipeline(...args);
}
