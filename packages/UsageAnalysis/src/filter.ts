export class UaFilter {
  date?: string = 'this week';
  groups?: string[] = [];
  packages?: string[] = ['all'];
  tags?: string[] = ['any'];
  packagesCategories?: string[] = ['any'];
  // events: string[] = ['all'];
  // isExactly: boolean = false;

  public constructor(init?: Partial<UaFilter>) {
    Object.assign(this, init);
  }
}
