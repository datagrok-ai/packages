/* Softmax or multinomial logistic regression:
   https://en.wikipedia.org/wiki/Multinomial_logistic_regression */

#ifndef SOFTMAX_H
#define SOFTMAX_H

#include <cmath>
using std::sqrt;
using std::log;
using std::fabs;

#include "../../../../Eigen/Eigen/Dense"
using namespace Eigen;

namespace softmax {
	// computation result code
	enum ResultCode {
		NO_ERRORS = 0,
		UNKNOWN_PROBLEM,
		INCORRECT_SIZES,
		ICORRECT_HYPER_PARAMS,
	};

    /* Fit parameters of softmax.
	     features - training data feature vectors (column-by-column)
		 avgs - features mean values
		 stdevs - features standard deviations
		 target - target values (value present categories as integers) 
		 samplesCount - number of train data samples
		 featuresCount - number of features
		 classesCount - number of classes
		 iterCount - number of iterations of the gradient descent
		 learningRate - learning rate
		 penalty - the penalty coefficient for regularization
		 tolerance - the fitting tolerance
		 params - parameters of the model (output of computations)

	   REMARK. Each target value is an integer presenting index category from 0 to classesCount-1.
	 */
	template<typename Float, typename Int>
	int fitSoftmax(Float * features, Float * avgs, Float * stdevs, Int * target, 
		const int samplesCount, const int featuresCount, const int classesCount,
		int iterCount, Float learningRate, Float penalty, float tolerance,
		Float * params) noexcept {
		
		// Operating counts
		const int n = featuresCount;
		const int m = samplesCount;
		const int c = classesCount;

        // Train data matrix
		Matrix<Float, Dynamic, Dynamic, ColMajor> X(n, m);
        
		// Transposed train data matrix, used when computaing gradients
		Map<Matrix<Float, Dynamic, Dynamic, ColMajor>> XT(features, m, n);

        // Vectors with features stats
		Map<Vector<Float, Dynamic>> avgX(avgs, n);
		Map<Vector<Float, Dynamic>> stdDevX(stdevs, n);

        // Matrix of train labels in the one-hot form
		Matrix<Float, Dynamic, Dynamic, ColMajor> Y(c, m);
		
		// Parameters of the model to be trained
		Matrix<Float, Dynamic, Dynamic, RowMajor> W(c, n);
		Vector<Float, Dynamic> B(c);

        // Operating items
		Matrix<Float, Dynamic, Dynamic, ColMajor> Z(c, m);		
		Matrix<Float, Dynamic, Dynamic, RowMajor> dZ(c, m);
		Matrix<Float, Dynamic, Dynamic, RowMajor> dW(c, n);
		Vector<Float, Dynamic> dB(c);
		Vector<Float, Dynamic> sums(m);
		uint32_t* classWeights = new uint32_t[c];
		Float loss = 0;
		Float lossPrev = 0;

		// 1. Prepare data

		// 1.1) Center features
		XT = XT.rowwise() - avgX.transpose();

		// 1.2) Scale features
		for (int i = 0; i < n; ++i)
			if (stdevs[i] > static_cast<Float>(0))
				XT.col(i) = XT.col(i) / stdDevX(i);

		// 1.3) Transpose
		X = XT.transpose();
		
		// 1.4) One-hot labels & class weights
		Y = Matrix<Float, Dynamic, Dynamic, ColMajor>::Zero(c, m); 
		for (int i = 0; i < c; ++i)
			classWeights[i] = 0;
        
		for (int i = 0; i < m; ++i) {
			Y(target[i], i) = static_cast<Float>(1);
			classWeights[target[i]] += 1;
		}

		// 2. Init parameters	
		Float xavierScale = sqrt(6.0 / (c + n));
		W = Matrix<Float, Dynamic, Dynamic, RowMajor>::Random(c, n) * xavierScale;
		B = Vector<Float, Dynamic>::Zero(c);
		
		// 3. The main training loop
		for (int iter = 0; iter < iterCount; ++iter) {			
			// Z = W * X + B
			Z = ((W * X).colwise() + B);

            // Z = exp(Z) with weights
			for (int j = 0; j < m; ++j)
				for (int i = 0; i < c; ++i)
					Z(i, j) = exp(Z(i, j)) * classWeights[i];
			
			sums = Z.colwise().sum();

            // Compute predicted probabilities
			for (int i = 0; i < m; ++i)
				Z.col(i) = Z.col(i) / sums(i);			

            // Copmute loss
            loss = 0;

			for (int i = 0; i < m; ++i)
				loss += -log(Z(target[i], i));
				
			loss /= m;

            // Check loss
			if ((fabs(loss - lossPrev) < tolerance) || (loss != loss))
				break;			
			lossPrev = loss;

            // Compute gradients
			dZ = Z - Y;			
			dB = dZ.rowwise().mean();
			dW = dZ * XT / m;

            // Update params
			W = W * (static_cast<Float>(1) - learningRate * penalty / m) - dW * learningRate;
			B = B - dB * learningRate;
		} // for iter	

        // Complete the output params
		Map<Matrix<Float, Dynamic, Dynamic, RowMajor>> P(params, c, n + 1);
		P.block(0, 0, c, n) = W;
		P.col(n) = B;

		delete[] classWeights;

		return NO_ERRORS;
	}; // fitSoftmax
}; // softmax

#endif // !SOFTMAX_H