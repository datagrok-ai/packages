// regression.h
// 
//Implementation linear regression coefficients computation

#include "../../../../Eigen/Eigen/Dense"
using namespace Eigen;

#ifndef REGRESSION_H
#define REGRESSION_H

namespace regr {

	// computation result code
	enum ResultCode {
		NO_ERRORS = 0,
		UNKNOWN_PROBLEM,
		INCORRECT_SIZES,
		DATA_WITH_ZERO_VARIATION
	};

	/* Compute coeffcicients of linear regression.
	    features - features data pointer, X (column-by-column)
		featureAvgs - mean values of feature columns
		featureStdDevs - standard deviations of feature columns
		targets - target values, Y
		targetsAvg - target mean value
		targetsStdDev - target standard deviation
		params - parameters to be computed
		samplesCount - number of samples
		featuresCount - number of features

	  REMARK. Data normalization is applied. */
	template<typename Float>
	int fitLinearRegressionParams(
		Float* features, 
		Float* featureAvgs,
		Float* featureStdDevs,
		Float* targets,
		Float targetsAvg,
		Float targetsStdDev,
		Float* params, 
		int samplesCount, 
		int featuresCount) noexcept 
	{
		// Associate matrices with pointers
		Map<Vector<Float, Dynamic>> beta(params, featuresCount);
		
		Map<Vector<Float, Dynamic>> y(targets, samplesCount);
		Vector<Float, 1> avgY;
		avgY(0) = targetsAvg;

		Map<Matrix<Float, Dynamic, Dynamic, RowMajor>> X(features, featuresCount, samplesCount);
		Map<Vector<Float, Dynamic>> avgX(featureAvgs, featuresCount);
		Map<Vector<Float, Dynamic>> stdDevX(featureStdDevs, featuresCount);

		// Normalize data
		y = (y.rowwise() - avgY) / targetsStdDev;

		X = X.colwise() - avgX;
		for (int i = 0; i < featuresCount; ++i)
			X.row(i) = X.row(i) / stdDevX(i);
				
		// Compute linear regression coefs
		auto buf = X * y;

		// Here, other Eigen decompositions can be used
		beta = (X * X.transpose()).ldlt().solve(buf);		

		// Rescale coefs, since data was normalized
		Float sum = 0;
		for (int i = 0; i < featuresCount; ++i) {
			params[i] *= targetsStdDev / featureStdDevs[i];
			sum += params[i] * featureAvgs[i];
		}

		params[featuresCount] = targetsAvg - sum;

		return NO_ERRORS;
	}

	/* Compute coeffcicients of linear regression.
		features - features data pointer, X (column-by-column)
		targets - target values, Y
		params - parameters to be computed
		samplesCount - number of samples
		featuresCount - number of features */
	template<typename Float>
	int fitLinearRegressionParams(
		Float* features,
		Float* targets,
		Float* params,
		int samplesCount,
		int featuresCount) noexcept
	{
		// Associate matrices with pointers
		Map<Vector<Float, Dynamic>> beta(params, featuresCount + 1);
		Map<Vector<Float, Dynamic>> y(targets, samplesCount);
		
		// Data matrix: D = [X | 1] (transposed)
		Matrix<Float, Dynamic, Dynamic, RowMajor> X(featuresCount + 1, samplesCount);
		auto ptr = X.data();

        // Fill D with feature values 
		size_t size = sizeof(Float) * featuresCount * samplesCount;
		std::memcpy(ptr, features, size);

		ptr += featuresCount * samplesCount;

		// Add row of 1-s
		for (int i = 0; i < samplesCount; ++i)
			ptr[i] = 1;

		// Compute linear regression coefs
		auto buf = X * y;

		// Here, other Eigen decompositions can be used
		beta = (X * X.transpose()).colPivHouseholderQr().solve(buf);
						
		return NO_ERRORS;
	}

}; // regr

#endif // !REGRESSION_H

