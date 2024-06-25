import * as DG from 'datagrok-api/dg';
// import * as ui from 'datagrok-api/ui';

export class TATab extends DG.ViewBase { 
  initialized: boolean = false;
  systemId: string = '00000000-0000-0000-0000-000000000000';
  rout?: string;

  constructor() {
    super(); 
    this.box = true;
  }

  async tryToinitViewers(path?: string): Promise<void> {
    if (!this.initialized) {
      this.initialized = true;
      await this.initViewers(path);
    }
  }

  async initViewers(path?: string): Promise<void> {}

  switchRout(): void {}
}
