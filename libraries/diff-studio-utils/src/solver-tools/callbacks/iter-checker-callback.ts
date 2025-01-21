import {Callback} from './callback-base';
import {CallbackAction} from '../solver-defs';

/** This callback terminates computations if the maximum iterations is exceeded */
export class IterCheckerCallback extends Callback {
  private maxIter: number;
  private currentIter: number;

  constructor(maxIter: number) {
    super();
    this.maxIter = maxIter;
    this.currentIter = 0;
  }

  public onIterationStart(): void {
    ++this.currentIter;

    if (this.currentIter > this.maxIter)
      throw new CallbackAction(`Max iterations count exceeded (${this.maxIter})`);
  }
}
