import {mmDistanceFunctionType} from './types';

// Blosum 62 matrix for protein sequences
const BLOSUM62:Array<Array<number>> =
[[4, -1, -2, -2, 0, -1, -1, 0, -2, -1, -1, -1, -1, -2, -1, 1, 0, -3, -2, 0, -2, -1, 0, -4],
  [-1, 5, 0, -2, -3, 1, 0, -2, 0, -3, -2, 2, -1, -3, -2, -1, -1, -3, -2, -3, -1, 0, -1, -4],
  [-2, 0, 6, 1, -3, 0, 0, 0, 1, -3, -3, 0, -2, -3, -2, 1, 0, -4, -2, -3, 3, 0, -1, -4],
  [-2, -2, 1, 6, -3, 0, 2, -1, -1, -3, -4, -1, -3, -3, -1, 0, -1, -4, -3, -3, 4, 1, -1, -4],
  [0, -3, -3, -3, 9, -3, -4, -3, -3, -1, -1, -3, -1, -2, -3, -1, -1, -2, -2, -1, -3, -3, -2, -4],
  [-1, 1, 0, 0, -3, 5, 2, -2, 0, -3, -2, 1, 0, -3, -1, 0, -1, -2, -1, -2, 0, 3, -1, -4],
  [-1, 0, 0, 2, -4, 2, 5, -2, 0, -3, -3, 1, -2, -3, -1, 0, -1, -3, -2, -2, 1, 4, -1, -4],
  [0, -2, 0, -1, -3, -2, -2, 6, -2, -4, -4, -2, -3, -3, -2, 0, -2, -2, -3, -3, -1, -2, -1, -4],
  [-2, 0, 1, -1, -3, 0, 0, -2, 8, -3, -3, -1, -2, -1, -2, -1, -2, -2, 2, -3, 0, 0, -1, -4],
  [-1, -3, -3, -3, -1, -3, -3, -4, -3, 4, 2, -3, 1, 0, -3, -2, -1, -3, -1, 3, -3, -3, -1, -4],
  [-1, -2, -3, -4, -1, -2, -3, -4, -3, 2, 4, -2, 2, 0, -3, -2, -1, -2, -1, 1, -4, -3, -1, -4],
  [-1, 2, 0, -1, -3, 1, 1, -2, -1, -3, -2, 5, -1, -3, -1, 0, -1, -3, -2, -2, 0, 1, -1, -4],
  [-1, -1, -2, -3, -1, 0, -2, -3, -2, 1, 2, -1, 5, 0, -2, -1, -1, -1, -1, 1, -3, -1, -1, -4],
  [-2, -3, -3, -3, -2, -3, -3, -3, -1, 0, 0, -3, 0, 6, -4, -2, -2, 1, 3, -1, -3, -3, -1, -4],
  [-1, -2, -2, -1, -3, -1, -1, -2, -2, -3, -3, -1, -2, -4, 7, -1, -1, -4, -3, -2, -2, -1, -2, -4],
  [1, -1, 1, 0, -1, 0, 0, 0, -1, -2, -2, 0, -1, -2, -1, 4, 1, -3, -2, -2, 0, 0, 0, -4],
  [0, -1, 0, -1, -1, -1, -1, -2, -2, -1, -1, -1, -1, -2, -1, 1, 5, -2, -2, 0, -1, -1, 0, -4],
  [-3, -3, -4, -4, -2, -2, -3, -2, -2, -3, -2, -3, -1, 1, -4, -3, -2, 11, 2, -3, -4, -3, -2, -4],
  [-2, -2, -2, -3, -2, -1, -2, -3, 2, -1, -1, -2, -1, 3, -3, -2, -2, 2, 7, -1, -3, -2, -1, -4],
  [0, -3, -3, -3, -1, -2, -2, -3, -3, 3, 1, -2, 1, -1, -2, -2, 0, -3, -1, 4, -3, -2, -1, -4],
  [-2, -1, 3, 4, -3, 0, 1, -1, 0, -3, -4, 0, -3, -3, -2, 0, -1, -4, -3, -3, 4, 1, -1, -4],
  [-1, 0, 0, 1, -3, 3, 4, -2, 0, -3, -3, 1, -1, -3, -1, 0, -1, -3, -2, -2, 1, 4, -1, -4],
  [0, -1, -1, -1, -2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -2, 0, 0, -2, -1, -1, -1, -1, -1, -4],
  [-4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, 1]];

// Protein indexes for BLOSUM matrix
const ProtIndexes: {[id:string]:number} = {
  'A': 0, 'R': 1, 'N': 2, 'D': 3, 'C': 4, 'Q': 5, 'E': 6, 'G': 7, 'H': 8,
  'I': 9, 'L': 10, 'K': 11, 'M': 12, 'F': 13, 'P': 14, 'S': 15, 'T': 16,
  'W': 17, 'Y': 18, 'V': 19, 'B': 20, 'Z': 21, 'X': 22, '*': 23
};

interface needlemanWunchArgs {
  gapOpen: number;
  gapExtend: number;
  scoringMatrix: number[][];
  alphabetIndexes: {[id:string]:number};
}

const defaultArgs: needlemanWunchArgs = {
  gapOpen: 8,
  gapExtend: 2,
  scoringMatrix: BLOSUM62,
  alphabetIndexes: ProtIndexes
};

/** Returns a function that calculates the distance between two sequences based on gap penalty and matrix */
export function needlemanWunch(args: Partial<needlemanWunchArgs>): mmDistanceFunctionType {
  return (seq1: string, seq2: string) : number => {
    const {gapOpen, gapExtend, scoringMatrix, alphabetIndexes} = {...defaultArgs, ...args};
    // As we don't need traceback, no need to store the whole matrix
    // Intead, we will store only the last two rows
    const matrix: number[][] = [
      new Array<number>(seq1.length + 1).fill(0),
      new Array<number>(seq1.length + 1).fill(0)
    ];
    // similarly, we need to keep track of what operation led to the current cell
    // i.e. whether we came from the left, top or diagonal to assign gap open/gap extend penalty
    const verticalGaps: boolean[] = new Array<boolean>(seq1.length + 1).fill(false);
    const horizontalGaps: boolean[] = new Array<boolean>(seq1.length + 1).fill(false);

    //variables to keep track which row we are in
    // they will swap places on each iteration
    let prevRow = 0;
    let currRow = 1;
    // Initialize first row
    for (let i = 0; i < seq1.length + 1; i++)
      matrix[0][i] = -gapOpen - i * gapExtend;

    // Calculate the rest of the matrix
    for (let i = 1; i < seq2.length + 1; i++) {
      matrix[currRow][0] = -gapOpen - (i - 1) * gapExtend;
      for (let j = 1; j < seq1.length + 1; j++) {
        const diagonal =
          matrix[prevRow][j - 1] + scoringMatrix[alphabetIndexes[seq1[j - 1]]][alphabetIndexes[seq2[i - 1]]];
        const top = matrix[prevRow][j] - (verticalGaps[j] ? gapExtend : gapOpen );
        const left = matrix[currRow][j - 1] - (horizontalGaps[j - 1] ? gapExtend : gapOpen);
        matrix[currRow][j] = Math.max(
          diagonal, left, top
        );
        // update gap arrays
        if (matrix[currRow][j] === diagonal) {
          verticalGaps[j] = false;
          horizontalGaps[j] = false;
        } else if (matrix[currRow][j] === left) {
          verticalGaps[j] = false;
          horizontalGaps[j] = true;
        } else {
          verticalGaps[j] = true;
          horizontalGaps[j] = false;
        }
      }
      // Swap rows
      prevRow = currRow;
      currRow = (currRow + 1) % 2;
    }
    // as the matrix is the similarity matrix, but we are interested in distance,
    // we need to invert the result
    return -matrix[prevRow][seq1.length];
  };
}
