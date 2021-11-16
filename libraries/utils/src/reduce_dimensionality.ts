import * as vec from 'vectorious';
import * as umj from 'umap-js';

import {SPEBase, PSPEBase} from './spe';
import {TSNE} from '@keckelt/tsne';
import {Options, DistanceMetric, Coordinates, Vectors, Matrix} from './type_declarations';

abstract class Reducer {
  protected data: Vectors;

  constructor(options: Options) {
    this.data = options.data;
  }

  abstract transform(): Coordinates;
}

class TSNEReducer extends Reducer {
  protected reducer: TSNE;
  protected iterations: number;
  protected distance: DistanceMetric;

  constructor(options: Options) {
    super(options);
    this.reducer = new TSNE(options);
    this.iterations = options?.iterations ?? 100;
    this.distance = options.distance;
  }

  protected calcDistanceMatrix(): Coordinates {
    const nItems = this.data.length;
    const dist = vec.zeros(nItems, nItems);

    for (let i = 0; i < nItems; ++i) {
      for (let j = i+1; j < nItems; ++j) {
        dist.set(i, j, this.distance(this.data[i], this.data[j]))
        dist.set(j, i, dist.get(i, j))
      }
    }
    return dist.toArray();
  }

  /**
   * transform
   * @return {Coordinates} Dimensionality reduced vectors.
   */
  public transform(): Coordinates {
    this.reducer.initDataDist(this.calcDistanceMatrix());

    for (let i = 0; i < this.iterations; ++i) {
      this.reducer.step(); // every time you call this, solution gets better
    }
    return this.reducer.getSolution();
  }
}

class UMAPReducer extends Reducer {
  protected reducer: umj.UMAP;

  constructor(options: Options) {
    super(options);
    this.reducer = new umj.UMAP(options);
  }

  /**
   * transform
   * @return {Coordinates} Dimensionality reduced vectors.
   */
  public transform(): Coordinates {
    const data = this.reducer.fit(this.data);
    const coordinates = new Matrix(data);
    return coordinates.toArray();
  }
}

class SPEReducer extends Reducer {
  protected reducer: SPEBase;

  constructor(options: Options) {
    super(options);
    this.reducer = new SPEBase(options);
  }

  /**
   * transform
   * @return {Coordinates} Dimensionality reduced vectors.
   */
  public transform(): Coordinates {
    return this.reducer.embed(this.data);
  }
}

class PSPEReducer extends Reducer {
  protected reducer: PSPEBase;

  constructor(options: Options) {
    super(options);
    this.reducer = new PSPEBase(options);
  }

  /**
   * transform
   * @return {Coordinates} Dimensionality reduced vectors.
   */
  public transform(): Coordinates {
    return this.reducer.embed(this.data);
  }
}

export class DimensionalityReducer {
  private reducer: Reducer | undefined;
  private methods: string[];

  constructor(data: any[], method: string, metric: DistanceMetric, options?: Options) {
    this.methods = ['UMAP', 'TSNE', 'SPE', 'PSPE'];

    if (!this.availableMethods.includes(method)) {
      throw new Error('The method "'+method+'" is not supported');
    }

    if (method == 'UMAP') {
      this.reducer = new UMAPReducer({...{data: data}, ...{distanceFn: metric}, ...options});
    } else if (method == 'TSNE') {
      this.reducer = new TSNEReducer({
        ...{data: data},
        ...{distance: metric},
        ...{iterations: options?.cycles ?? undefined},
        ...options,
      });
    } else if (method == 'SPE') {
      this.reducer = new SPEReducer({...{data: data}, ...{distance: metric}, ...options});
    } else {
      this.reducer = new PSPEReducer({...{data: data}, ...{distance: metric}, ...options});
    }
  }

  public transform(): Coordinates {
    if (this.reducer == undefined) {
      throw new Error('Reducer was not defined.');
    }
    return this.reducer.transform();
  }

  get availableMethods() {
    return this.methods;
  }
}
