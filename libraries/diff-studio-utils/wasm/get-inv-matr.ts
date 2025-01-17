import {invMatr} from './matr-api.js';

export async function invMatrix(matr: Float64Array) {
    await invMatr(matr);
}
