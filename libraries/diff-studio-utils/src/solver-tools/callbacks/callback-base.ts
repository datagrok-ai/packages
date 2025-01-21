// Solver's callback base

/** Solver callback */
export class Callback {
  constructor() {};
  public onIterationStart(): void {}
  public onComputationsCompleted(): void {}
};
