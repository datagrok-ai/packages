import * as grok from 'datagrok-api/grok';
import * as ui from 'datagrok-api/ui';
import * as DG from 'datagrok-api/dg';

import wu from 'wu';

import {Molecule3DUnits} from '@datagrok-libraries/bio/src/molecule-3d/molecule-3d-units-handler';
import {DockingRole, DockingTags} from '@datagrok-libraries/bio/src/viewers/molecule3d';
import {IPdbqtAtomBase} from '@datagrok-libraries/bio/src/pdb/format/types';

import {PdbqtAtomCoords, PdbqtAtomTer, VinaResultType} from '@datagrok-libraries/bio/src/pdb/format/types-pdbqt';

import {_package} from '../package';
import {IMPORT} from '../consts-import';


export class PdbqtBranch {
  currentChild: PdbqtBranch | null = null;
  children: PdbqtBranch[] = [];
  remarks: string[] = [];
  atoms: IPdbqtAtomBase[] = [];

  public get isEmpty(): boolean {
    return this.remarks.length == 0 && this.atoms.length == 0 && this.children.length == 0;
  }

  constructor(
    public readonly parentAtomNum: number,
    public readonly branchAtomNum: number,
  ) {}

  static fromStr(line: string): PdbqtBranch {
    const ma = line.match(/BRANCH\s+(?<parentAtomNum>\d+)\s+(?<branchAtomNum>\d+)/i)!;
    const res = new PdbqtBranch(
      parseInt(ma.groups!['parentAtomNum']),
      parseInt(ma.groups!['branchAtomNum']));
    return res;
  }

  public pushBranch(line: string): void {
    if (!!this.currentChild) {
      //
      this.currentChild.pushBranch(line);
    } else {
      const cc = this.currentChild;
      this.children.push(this.currentChild = PdbqtBranch.fromStr(line));
    }
  }

  public closeBranch(line: string): void {
    if (this.currentChild!.currentChild != null) {
      //
      this.currentChild!.closeBranch(line);
    } else {
      const ma = line.match(/ENDBRANCH\s+(?<parentAtomNum>\d+)\s+(?<branchAtomNum>\d+)/i)!;
      const parentAtomNum = parseInt(ma.groups!['parentAtomNum']);
      const branchAtomNum = parseInt(ma.groups!['branchAtomNum']);

      // Check the last child is the current
      if (this.children.slice(-1)[0] !== this.currentChild)
        throw new Error('On closing branch the last child must be the current.');
      if (this.currentChild.parentAtomNum !== parentAtomNum || this.currentChild.branchAtomNum != branchAtomNum)
        throw new Error('Closing branch connection mismatch.');
      this.currentChild = null;
    }
  }

  public pushRemark(line: string): void {
    this.remarks.push(line);
  }

  public pushAtom(line: string): void {
    if (this.currentChild)
      this.currentChild.pushAtom(line);
    else
      this.atoms.push(PdbqtAtomCoords.fromStr(line));
  }

  /** Pushes all atoms of branches recursively to {@link flatAtomList} */
  public flattenAtoms(flatAtomList: IPdbqtAtomBase[]): void {
    flatAtomList.push(...this.atoms);
    for (const child of this.children)
      child.flattenAtoms(flatAtomList);
  }
}

/**
 * value RegEx should contain a single group for float
 * Example:
 * USER    Estimated Free Energy of Binding    =  +5.41e+03 kcal/mol  [=(1)+(2)+(3)-(4)]
 * USER
 * USER    (1) Final Intermolecular Energy     =  +5.41e+03 kcal/mol
 * USER        vdW + Hbond + desolv Energy     =  +5.41e+03 kcal/mol
 * USER        Electrostatic Energy            =  +1.54 kcal/mol
 * USER        Moving Ligand-Fixed Receptor    =  +5.41e+03 kcal/mol
 * USER        Moving Ligand-Moving Receptor   =  +0.00 kcal/mol
 * USER    (2) Final Total Internal Energy     =+141.61 kcal/mol
 */
const mantissaReS = '[+-]?[\\d]*(\\.\\d+)?';
const orderReS = 'e[+-]\\d+';
const floatReS = `${mantissaReS}(${orderReS})?`;
const pdbqtUserTemplates: {
  [p: string]: RegExp
} = {
  affinity: new RegExp(`Estimated Free Energy of Binding *= *(${floatReS}) *kcal\/mol`),
  intermolecular: new RegExp(`\\(1\\) *Final Intermolecular Energy *= *(${floatReS}) *kcal\/mol`),
  electrostatic: new RegExp(`Electrostatic Energy *= *(${floatReS}) *kcal\/mol`),
  ligandFixed: new RegExp(`Moving Ligand-Fixed Receptor *= *(${floatReS}) *kcal\/mol`),
  ligandMoving: new RegExp(`Moving Ligand-Moving Receptor *= *(${floatReS}) *kcal\/mol`),
  totalInternal: new RegExp(`\\(2\\) *Final Total Internal Energy *= *(${floatReS}) *kcal\/mol`),
  torsionalFree: new RegExp(`\\(3\\) *Torsional Free Energy *= *(${floatReS}) *kcal\/mol`),
  unboundSystems: new RegExp(`\\(4\\) *Unbound System's Energy *= *(${floatReS}) *kcal\/mol`),
};

export class PdbqtModel extends PdbqtBranch {
  name!: string;
  userList: string[] = [];
  root!: PdbqtAtomCoords[];
  vinaResult!: VinaResultType;

  affinity!: number;
  intermolecular!: number;
  electrostatic!: number;
  ligandFixed!: number;
  ligandMoving!: number;
  totalInternal!: number;
  torsionalFree!: number;
  unboundSystems!: number;

  private _torsdof = 0;
  public get torsdof(): number { return this._torsdof; }

  private srcTer: boolean = false;

  constructor() {
    super(0, 0);
  }

  /**
   * autodock-gpu result contains USER records with scoring values
   */
  pushUser(line: string): void {
    this.userList.push(line);

    for (const [p, re] of Object.entries(pdbqtUserTemplates)) {
      const valEa = re.exec(line);
      if (valEa) {
        const valS: string = valEa[1];
        const valF: number = parseFloat(valS);
        // @ts-ignore
        this[p] = valF;
      }
    }
  }

  pushTorsdof(v: number): void {
    this._torsdof = v;
  }

  pushTer(line: string) {
    this.srcTer = true;
  }

  override pushBranch(line: string): void {
    if (line === 'ROOT') {
      // Do nothing
    } else
      super.pushBranch(line);
  }

  override closeBranch(line: string): void {
    if (line === 'ENDROOT')
      this.currentChild = null;
    else
      super.closeBranch(line);
  }

  public toPdb(): string {
    const atomFlatList: IPdbqtAtomBase[] = []; // TODO: Use know-n atom count
    this.flattenAtoms(atomFlatList);
    const pdbLineList: string[] = atomFlatList
      .map((a) => a.toPdb())
      .sort((a, b) => {
        return a.compare(b);
      })
      .map((a) => a.toStr());
    return [
      'COMPND    ' + '',
      ...pdbLineList,
      'TER',
      'END',
    ].join('\n');
  }
}

export class Pdbqt {
  private currentModel: PdbqtModel | null = null;

  public readonly models: PdbqtModel[] = [];

  private _target: PdbqtModel | null = null;
  public get target(): PdbqtModel | null { return this._target; }

  constructor() { }

  pushModel(model: PdbqtModel): void {
    this.models.push(this.currentModel = model);
  }

  closeModel(): void {
    this.currentModel = null;
  }

  pushModelVinaResult(vinaResult: VinaResultType): void { this.currentModel!.vinaResult = vinaResult; }

  pushModelName(name: string): void { this.currentModel!.name = name; }


  /** Builds {@link DG.DataFrame } with ligand pose (MODEL) per row. */
  toDataFrame(molColName: string = IMPORT[Molecule3DUnits.pdbqt].molColName): DG.DataFrame {
    const len = this.models.length;
    const molCol = DG.Column.fromType(DG.COLUMN_TYPE.STRING, molColName, len)
      .init((rowI) => this.models[rowI].toPdb());
    molCol.setTag(DG.TAGS.SEMTYPE, DG.SEMTYPE.MOLECULE3D);
    molCol.setTag(DG.TAGS.UNITS, Molecule3DUnits.pdb);
    molCol.setTag(DockingTags.dockingRole, DockingRole.ligand);
    const nameCol = DG.Column.fromType(DG.COLUMN_TYPE.STRING, 'name', len)
      .init((rowI) => this.models[rowI].name);
    const affinityCol = DG.Column.fromType(DG.COLUMN_TYPE.FLOAT, 'binding energy', len)
      .init((rowI) => this.models[rowI].affinity ?? this.models[rowI].vinaResult?.affinity);
    const intermolecularCol = DG.Column.fromType(DG.COLUMN_TYPE.FLOAT, 'intermolecular (1)', len)
      .init((rowI) => this.models[rowI].intermolecular);
    const electrostaticCol = DG.Column.fromType(DG.COLUMN_TYPE.FLOAT, 'electrostatic', len)
      .init((rowI) => this.models[rowI].electrostatic);
    const ligandFixedCol = DG.Column.fromType(DG.COLUMN_TYPE.FLOAT, 'ligand fixed', len)
      .init((rowI) => this.models[rowI].ligandFixed);
    const ligandMovingCol = DG.Column.fromType(DG.COLUMN_TYPE.FLOAT, 'ligand moving', len)
      .init((rowI) => this.models[rowI].ligandMoving);
    const totalInternalCol = DG.Column.fromType(DG.COLUMN_TYPE.FLOAT, 'total internal (2)', len)
      .init((rowI) => this.models[rowI].totalInternal);
    const torsionalFreeCol = DG.Column.fromType(DG.COLUMN_TYPE.FLOAT, 'torsional free (3)', len)
      .init((rowI) => this.models[rowI].torsionalFree);
    const unboundSystemsCol = DG.Column.fromType(DG.COLUMN_TYPE.FLOAT, 'unbound systems (4)', len)
      .init((rowI) => this.models[rowI].unboundSystems);
    // const lbDistFromBestCol = DG.Column.fromType(DG.COLUMN_TYPE.FLOAT, 'lbDistFromBest', len)
    //   .init((rowI) => this.models[rowI].vinaResult.lbDistFromBest);
    // const ubDistFromBestCol = DG.Column.fromType(DG.COLUMN_TYPE.FLOAT, 'ubDistFromBest', len)
    //   .init((rowI) => this.models[rowI].vinaResult.ubDistFromBest);

    const resDf = DG.DataFrame.fromColumns([molCol, nameCol,
      affinityCol, intermolecularCol, electrostaticCol, ligandFixedCol,
      ligandMovingCol, totalInternalCol, torsionalFreeCol, unboundSystemsCol]);

    if (this.target && !this.target.isEmpty) {
      const targetPdbStr: string = this.target.toPdb();
      resDf.setTag(DockingTags.dockingTarget, targetPdbStr);
    }

    return resDf;
  }

  // -- parse --

  static parse(cnt: string): Pdbqt {
    const res: Pdbqt = new Pdbqt();
    const target = new PdbqtModel();
    // trim end of lines for CR
    for (const [line, lineI] of wu(cnt.split('\n').map((l) => l.replace(/\r$/, ''))).enumerate()) {
      try {
        switch (line.slice(1 - 1, 6)) {
        case 'MODEL ': {
          const model = new PdbqtModel();
          res.pushModel(model);
          break;
        }
        case 'ENDMDL': {
          res.currentModel!.closeBranch('ENDROOT'); // overcome
          res.closeModel();
          break;
        }

        case 'ROOT':
        case 'BRANCH': {
          if (!res.currentModel) {
            const model = new PdbqtModel();
            res.pushModel(model);
          }
          res.currentModel!.pushBranch(line);
          break;
        }

        case 'ENDROO': {
          // Do nothing because ENDROOT before BRANCHES, close root on ENDMDL
          break;
        }

        case 'ENDBRA': {
          res.currentModel!.closeBranch(line);
          break;
        }

        case 'HETATM':
        case 'ATOM  ': {
          if (res.currentModel)
            res.currentModel!.pushAtom(line);
          else
            target.pushAtom(line);
          break;
        }

        case 'SEQRES':
        case 'HELIX ':
        case 'SHEET ': {
          _package.logger.warning(`Pdbqt.parse() unsupported line '${line}'.`);
          break;
        }

        case 'REMARK': {
          let nameMa: RegExpMatchArray | null;
          if (line.startsWith('REMARK VINA RESULT:')) {
            res.pushModelVinaResult({
              affinity: parseFloat(line.substring(20, 29)),
              lbDistFromBest: parseFloat(line.substring(30, 40)),
              ubDistFromBest: parseFloat(line.substring(41, 51)),
            });
          } else if (nameMa = line.match(/REMARK\s+Name *= *(?<name>.+)/i))
            res.pushModelName(nameMa.groups!['name']);
          else if (res.currentModel)
            res.currentModel.pushRemark(line);
          else
            target.pushRemark(line);
          break;
        }

        case 'TER': // empty TER lines
        case 'TER   ': {
          if (res.currentModel)
            res.currentModel.pushTer(line);
          else
            target.pushTer(line);
          break;
        }

        case 'TORSDO': {
          const ma = line.match(/^TORSDOF (?<value>\d+)/)!;
          const v = parseInt(ma.groups!['value']);
          res.currentModel!.pushTorsdof(v);
          break;
        }

        case 'USER': // empty USER lines
        case 'USER  ': {
          res.currentModel!.pushUser(line);
          break;
        }

        case '': {
          // ignore empty line (last empty line)
          break;
        }
        default:
          throw new Error(`Pdbqt unsupported line #${lineI} '${line}'.`);
        }
      } catch (err: any) {
        // @ts-ignore
        throw new Error(`Error on pdbqt line #${lineI} '${line}'.`, {cause: err});
      }
    }
    if (target.remarks.length > 0 || target.atoms.length > 0)
      res._target = target;
    return res;
  }
}

