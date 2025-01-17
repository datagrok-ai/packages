import {exportMatrOper} from './matrix-operations';

export async function invMatr(matr) {
    let wasmInstance = await exportMatrOper();
    const mem = wasmInstance._malloc(matr.length * 4);
    wasmInstance._free(mem);
    console.log('Done!');
}
