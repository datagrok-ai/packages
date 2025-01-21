import {Callback} from './callback-base';
import {CallbackAction} from '../solver-defs';

/** This callback terminates computations if the maximum calculation time is exceeded */
export class TimeCheckerCallback extends Callback {
  private maxTime = 0;
  private startingTime = 0;

  constructor(maxTime: number) {
    super();
    this.maxTime = maxTime;
    this.startingTime = performance.now();
  }

  public onIterationStart(): void {
    if (performance.now() - this.startingTime > this.maxTime)
      throw new CallbackAction(`Max time exceeded (${this.maxTime} ms)`);
  }
}
