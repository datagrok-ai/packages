/*function luDecomp(A: Float64Array, n: number) {
    const L = new Float64Array(n * n).fill(0);
    const U = new Float64Array(n * n).fill(0);

    for (let i = 0; i < n; ++i)
        L[i * n + i] = 1;

    let sumU = 0;
    let sumL = 0;
    let k = 0;
    let j = 0;
    let p = 0;
    let i =0;

    for (k = 0; k < n; ++k) {
        for (j = k; j < n; ++j) {
            sumU = 0;

            for (p = 0; p < k; ++p)
                sumU += L[k * n + p] * U[p * n + j];            

            U[k * n + j] = A[k * n +j] - sumU;
        }        
        
        for (i = k + 1; i < n; ++i) {
            sumL = 0;

            for (p = 0; p < k; ++p)
                sumL += L[i * n + p] * U[p * n + k];

            L[i * n + k] = (A[i * n + k] - sumL) / U[k * n + k];
        }
    }
    
    return {L: L, U: U};
}

function forwSubs(L: Float64Array, b: Float64Array, n: number) {
    const y = new Float64Array(n);
    let sumLy = 0;

    for (let i = 0; i < n; ++i) {
        sumLy = 0;

        for (let j = 0; j < i; ++j)
            sumLy += L[i * n + j] * y[j];

        y[i] = (b[i] - sumLy) / L[i * n + i];
    }  
    
    return y;
}

function backSubs(U: Float64Array, y: Float64Array, n: number) {
    const x = new Float64Array(n);
    let sumUx = 0;

    for (let i = n - 1; i > -1; --i) {
        sumUx = 0;

        for (let j = i + 1; j < n; ++j)
            sumUx += U[i * n + j] * x[j];

        x[i] = (y[i] - sumUx) / U[i * n + i];
    }

    return x;
}*/

function luDecomp(A: Float64Array, L: Float64Array, U: Float64Array, n: number) {
    L.fill(0);
    U.fill(0);

    for (let i = 0; i < n; ++i)
        L[i * n + i] = 1;

    let sumU = 0;
    let sumL = 0;
    let k = 0;
    let j = 0;
    let p = 0;
    let i =0;

    for (k = 0; k < n; ++k) {
        for (j = k; j < n; ++j) {
            sumU = 0;

            for (p = 0; p < k; ++p)
                sumU += L[k * n + p] * U[p * n + j];            

            U[k * n + j] = A[k * n +j] - sumU;
        }        
        
        for (i = k + 1; i < n; ++i) {
            sumL = 0;

            for (p = 0; p < k; ++p)
                sumL += L[i * n + p] * U[p * n + k];

            L[i * n + k] = (A[i * n + k] - sumL) / U[k * n + k];
        }
    }
}

function forwSubs(L: Float64Array, b: Float64Array, y: Float64Array, n: number) {
    let sumLy = 0;

    for (let i = 0; i < n; ++i) {
        sumLy = 0;

        for (let j = 0; j < i; ++j)
            sumLy += L[i * n + j] * y[j];

        y[i] = (b[i] - sumLy) / L[i * n + i];
    }
}

function backSubs(U: Float64Array, y: Float64Array, x: Float64Array, n: number) {
    let sumUx = 0;

    for (let i = n - 1; i > -1; --i) {
        sumUx = 0;

        for (let j = i + 1; j < n; ++j)
            sumUx += U[i * n + j] * x[j];

        x[i] = (y[i] - sumUx) / U[i * n + i];
    }
}

function solve(L: Float64Array, U: Float64Array, b: Float64Array, y: Float64Array, x: Float64Array, n: number) {
    let sumLy = 0;

    for (let i = 0; i < n; ++i) {
        sumLy = 0;

        for (let j = 0; j < i; ++j)
            sumLy += L[i * n + j] * y[j];

        y[i] = (b[i] - sumLy) / L[i * n + i];
    }
    
    let sumUx = 0;

    for (let i = n - 1; i > -1; --i) {
        sumUx = 0;

        for (let j = i + 1; j < n; ++j)
            sumUx += U[i * n + j] * x[j];

        x[i] = (y[i] - sumUx) / U[i * n + i];
    }
}

let A = new Float64Array([
    2, 3, 5,
    4, -5, 2,
    1, 2, 3,
]);

let b = new Float64Array([
    10,
    1,
    6,
]);

let L = new Float64Array(3 * 3);
let U = new Float64Array(3 * 3);

let x = new Float64Array(3);
let y = new Float64Array(3);

luDecomp(A, L, U, 3);
solve(L, U, b, y, x, 3);

console.log("Hello!");
console.log(x);

/*


def backward_substitution(U, y):
    """
    Solves Ux = y for x using backward substitution.
    """
    n = U.shape[0]
    x = np.zeros(n)
    
    for i in range(n-1, -1, -1):
        sum_ux = sum(U[i][j] * x[j] for j in range(i+1, n))
        x[i] = (y[i] - sum_ux) / U[i][i]
    
    return x

def matrix_inverse_lu(A):
    """
    Computes the inverse of matrix A using LU decomposition.
    
    Parameters:
        A (numpy.ndarray): Input square matrix
    
    Returns:
        A_inv (numpy.ndarray): Inverse of matrix A
    
    Raises:
        ValueError: If matrix is not square or is singular
    """
    n = A.shape[0]
    if A.shape[1] != n:
        raise ValueError("Matrix must be square")
    
    # Get LU decomposition
    L, U = lu_decomposition(A)
    
    # Initialize inverse matrix
    A_inv = np.zeros((n, n))
    
    # Compute inverse column by column
    for j in range(n):
        # Create unit vector ej
        ej = np.zeros(n)
        ej[j] = 1.0
        
        # Solve Ly = ej for y
        y = forward_substitution(L, ej)
        
        # Solve Ux = y for x (jth column of inverse)
        x = backward_substitution(U, y)
        
        # Store the column in the inverse matrix
        A_inv[:, j] = x
    
    return A_inv

def verify_inverse(A, A_inv, tolerance=1e-10):
    """
    Verifies if computed inverse is correct by checking if A * A_inv ≈ I.
    
    Parameters:
        A (numpy.ndarray): Original matrix
        A_inv (numpy.ndarray): Computed inverse matrix
        tolerance (float): Maximum allowed deviation from identity matrix
    
    Returns:
        bool: True if inverse is correct within tolerance
    """
    n = A.shape[0]
    I = np.eye(n)
    product = np.dot(A, A_inv)
    
    return np.allclose(product, I, atol=tolerance)*/
