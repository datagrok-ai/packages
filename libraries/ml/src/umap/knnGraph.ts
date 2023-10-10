

export function getKnnGraph(i: Int32Array, j: Int32Array, distances: Float32Array,
    neighbours: number, dataLength: number) {
        function insert(distancesAr: number[], indexes: number[], num: number, index: number) {
            if (num > distancesAr[distancesAr.length-1]) {
                return;
            }
            let k = distancesAr.length - 2;
            for(k = distancesAr.length - 2; k >= 0; k--) {
                if (num > distancesAr[k]) {
                    break;
                }
            }
            distancesAr.splice(distancesAr.length - 1, 1);
            distancesAr.splice(k+1, 0, num);
            indexes.splice(indexes.length - 1, 1);
            indexes.splice(k+1, 0, index);
        }
            

        console.time('knnGraph')
        const knnIndexes = new Array(dataLength).fill(null).map(() => new Array<number>(neighbours).fill(1));
        const knnDistances = new Array(dataLength).fill(null).map(() => new Array<number>(neighbours).fill(1));

        for (let k = 0; k < i.length; k++) {
            insert(knnDistances[i[k]], knnIndexes[i[k]], distances[k], j[k]);
            insert(knnDistances[j[k]], knnIndexes[j[k]], distances[k], i[k]);
        }

        console.timeEnd('knnGraph');
        return {knnIndexes, knnDistances};
}