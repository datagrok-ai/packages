// pls.cpp
// Principal Component Analysis (PCA) using the lib Eigen: implementation of functions

// The following STL lib is used for printing results and their verifying
//#include<iostream>
//using namespace std;

#include "../../../Eigen/Eigen/Dense"
using namespace Eigen;

#include "PLS.h"
using pls::Float;
using pls::Double;

/* Partial Least Square (PLS1).
      predictorColumnsDataPtr - data from columns that are used for prediction
	  rowCount - number of rows
	  columnCount - number of columns
	  responseColumnDataPtr - data from column that is predicted, i.e. responce
	  componentsCount - number of components that extracted in PLS
	  predictionDataPtr - prediction obtained using PLS (its size is equal to the size of responce)
	  regressionCoefficients - coeffcient of linear regression that are computed (their size is eqaul to the number of columns)

   WARNING! This provides correct results for the case, when predictor columns have the same distribution!
*/
int pls::partialLeastSquare(Float * predictorColumnsDataPtr,
	const int rowCount,
	const int columnCount,
	Float * responseColumnDataPtr,
	const int componentsCount,
	Float * predictionDataPtr,
	Float * regressionCoefficients) noexcept
{
	// check correctness of arguments
	if (componentsCount <= 0 || componentsCount > columnCount)
		return UNCORRECT_ARGUMENTS_ERROR;

	// Further, notation from the paper https://doi.org/10.1002/cem.2589 is used (see Algorithm 2).

	// create matrix, which is associated with predictor data
	Map < Matrix<Float, Dynamic, Dynamic, ColMajor>> D(predictorColumnsDataPtr, rowCount, columnCount);

	//cout << "\nD:\n" << D << endl;

	// compute mean value of each column of D
	Vector<Float, Dynamic> mu = D.colwise().mean();

	//cout << "\nmu:\n" << mu << endl;

	// mean-centered version of D
	Matrix<Float, Dynamic, Dynamic, ColMajor> X = D.rowwise() - mu.transpose();

	// create a vector, which is associated with responce or predicted data 
	Map<Vector<Float, Dynamic>> y(responseColumnDataPtr, rowCount);

	// create a vector, which is associtated with regression coefficients
	Map<Vector<Float, Dynamic>> b(regressionCoefficients, columnCount);

	// create a vector, which is associated with prediction data 
	Map<Vector<Float, Dynamic>> prediction(predictionDataPtr, rowCount);

	// PLS1 algorithm routine

	Matrix<Float, Dynamic, Dynamic, ColMajor> W(columnCount, componentsCount);

	Matrix<Float, Dynamic, Dynamic, ColMajor> P(columnCount, componentsCount);

	Matrix<Float, Dynamic, Dynamic, ColMajor> T(rowCount, componentsCount);

	Vector<Float, Dynamic> normTau(componentsCount);

	Vector<Float, Dynamic> q(componentsCount);

	Vector<Float, Dynamic> normV(componentsCount);

	// PLS1 algorithm: see Algorithm 2 in https://doi.org/10.1002/cem.2589

	Vector<Float, Dynamic> w = (X.transpose() * y);

	normV(0) = w.norm();

	// prevent division by zero
	if (normV(0) == static_cast<Float>(0))
		return METHOD_ERROR;

	w = w / normV(0);

	W.col(0) = w;

	Vector<Float, Dynamic> t = X * w;

	normTau(0) = t.norm();

	// prevent division by zero
	if (normTau(0) == static_cast<Float>(0))
		return METHOD_ERROR;

	t = t / normTau(0);

	T.col(0) = t;

	Vector<Float, Dynamic> p = X.transpose() * t;

	P.col(0) = p;

	q(0) = t.transpose() * y;

	for (int a = 1; a < componentsCount; a++)
	{
		w = normV(a - 1) * (w - p / normTau(a - 1));

		normV(a) = w.norm();

		// prevent division by zero
		if (normV(a) == static_cast<Float>(0))
			return METHOD_ERROR;

		w = w / normV(a);

		W.col(a) = w;

		t = X * w;

		t = t - T.leftCols(a) * (T.leftCols(a).transpose() * t);

		normTau(a) = t.norm();

		// prevent division by zero
		if (normTau(a) == static_cast<Float>(0))
			return METHOD_ERROR;

		t = t / normTau(a);

		T.col(a) = t;

		p = X.transpose() * t;

		P.col(a) = p;

		q(a) = t.transpose() * y;
	} // for a	
	
	// compute coefficients of regression
	Matrix<Float, Dynamic, Dynamic> H = P.transpose() * W;

	// chech existence of inverse matrix
	if (H.determinant() == static_cast<Float>(0))
		return METHOD_ERROR;

	b = W * H.inverse() * q;

	//cout << "\nb:\n" << b << endl;

	//cout << "\nq:\n" << q << endl;

	//cout << "\nD:\n" << D << endl;

	prediction = D * b;

	//cout << "\nprediction\n" << prediction << endl;

	return NO_ERROR;
} // partialLeastSquare

  /* Partial Least Square (PLS1).
        predictorColumnsDataPtr - data from columns that are used for prediction
        rowCount - number of rows
        columnCount - number of columns
        responseColumnDataPtr - data from column that is predicted, i.e. responce
        componentsCount - number of components that extracted in PLS
        predictionDataPtr - prediction obtained using PLS (its size is equal to the size of responce)
        regressionCoefficients - coeffcient of linear regression that are computed (their size is eqaul to the number of columns)

        WARNING! This provides correct results for the case, when predictor columns have the same distribution!

        This implementation of PLS uses deflation step, so it's slower!
  */
int pls::partialLeastSquare_slow(Float * predictorColumnsDataPtr,
	const int rowCount,
	const int columnCount,
	Float * responseColumnDataPtr,
	const int componentsCount,
	Float * predictionDataPtr,
	Float * regressionCoefficients) noexcept
{
	// check correctness of arguments
	if (componentsCount <= 0 || componentsCount > columnCount)
		return UNCORRECT_ARGUMENTS_ERROR;

	// Further, notation from the paper https://doi.org/10.1002/cem.2589 is used (see Algorithm 2).

	// create matrix, which is associated with predictor data
	Map < Matrix<Float, Dynamic, Dynamic, ColMajor>> D(predictorColumnsDataPtr, rowCount, columnCount);

	//cout << "\nD:\n" << D << endl;

	// compute mean value of each column of D
	Vector<Float, Dynamic> mu = D.colwise().mean();

	//cout << "\nmu:\n" << mu << endl;

	// mean-centered version of D
	Matrix<Float, Dynamic, Dynamic, ColMajor> X = D.rowwise() - mu.transpose();

	// create a vector, which is associated with responce or predicted data 
	Map<Vector<Float, Dynamic>> y(responseColumnDataPtr, rowCount);

	// create a vector, which is associtated with regression coefficients
	Map<Vector<Float, Dynamic>> b(regressionCoefficients, columnCount);

	// create a vector, which is associated with prediction data 
	Map<Vector<Float, Dynamic>> prediction(predictionDataPtr, rowCount);

	// PLS1 algorithm routine

	Matrix<Float, Dynamic, Dynamic, ColMajor> W(columnCount, componentsCount);

	Matrix<Float, Dynamic, Dynamic, ColMajor> P(columnCount, componentsCount);

	Matrix<Float, Dynamic, Dynamic, ColMajor> T(rowCount, componentsCount);

	Vector<Float, Dynamic> normTau(componentsCount);

	Vector<Float, Dynamic> q(componentsCount);

	// PLS1 algorithm: see Algorithm 1 in https://doi.org/10.1002/cem.2589


	for (int k = 0; k < componentsCount; k++)
	{
		Vector<Float, Dynamic> w = (X.transpose() * y).normalized();

		W.col(k) = w;

		Vector<Float, Dynamic> t = (X * w).normalized();

		Vector<Float, Dynamic> p = X.transpose() * t;

		P.col(k) = p;

		X = X - t * (p.transpose());

		q(k) = t.transpose() * y;
	}

	  // compute coefficients of regression
	Matrix<Float, Dynamic, Dynamic> H = P.transpose() * W;

	// chech existence of inverse matrix
	if (H.determinant() == static_cast<Float>(0))
		return METHOD_ERROR;

	b = W * H.inverse() * q;

	//cout << "\nb:\n" << b << endl;

	//cout << "\nq:\n" << q << endl;

	//cout << "\nD:\n" << D << endl;

	prediction = D * b;

	//cout << "\nprediction\n" << prediction << endl;

	return NO_ERROR;
} // partialLeastSquare_slow

  /* Partial Least Square (PLS1).
        predictorColumnsDataPtr - data from columns that are used for prediction
        rowCount - number of rows
        columnCount - number of columns
        responseColumnDataPtr - data from column that is predicted, i.e. responce
        componentsCount - number of components that extracted in PLS
        predictionDataPtr - prediction obtained using PLS (its size is equal to the size of responce)
        regressionCoefficients - coeffcient of linear regression that are computed (their size is eqaul to the number of columns)
  */
int pls::partialLeastSquare_norm(Float * predictorColumnsDataPtr,
	const int rowCount,
	const int columnCount,
	Float * responseColumnDataPtr,
	const int componentsCount,
	Float * predictionDataPtr,
	Float * regressionCoefficients) noexcept
{
	// check correctness of arguments
	if (componentsCount <= 0 || componentsCount > columnCount)
		return UNCORRECT_ARGUMENTS_ERROR;

	// Further, notation from the paper https://doi.org/10.1002/cem.2589 is used (see Algorithm 2).

	// create matrix, which is associated with predictor data
	Map < Matrix<Float, Dynamic, Dynamic, ColMajor>> D(predictorColumnsDataPtr, rowCount, columnCount);

	//cout << "\nD:\n" << D << endl;

	// compute mean value of each column of D
	Vector<Float, Dynamic> mu = D.colwise().mean();

	//cout << "\nmu:\n" << mu << endl;

	// mean-centered version of D
	Matrix<Float, Dynamic, Dynamic, ColMajor> X = D.rowwise() - mu.transpose();

	Vector<Float, Dynamic> stdDevX(columnCount);

	//cout << "\nX:\n" << X << endl;

	Float rowCountSqrt = sqrt(static_cast<Float>(rowCount));

	for (int i = 0; i < columnCount; i++)
	{
		stdDevX(i) = X.col(i).norm() / rowCountSqrt;
		X.col(i) = X.col(i) / stdDevX(i);		
	}

	//cout << "\nX:\n" << X << endl;

	//cout << "\nstdDevX:\n" << stdDevX << endl;

	// create a vector, which is associated with responce or predicted data 
	Map<Vector<Float, Dynamic>> ySource(responseColumnDataPtr, rowCount);		

	Vector<Float, 1> meanY;
	meanY(0) = ySource.mean();		

	Vector<Float, Dynamic> y = ySource.rowwise() - meanY;

	Float stdDevY = sqrt(y.squaredNorm() / rowCount);

	y /= stdDevY;

	/*cout << "\ny processed:\n" << y << endl;
	cout << "\nnorm: " << y.squaredNorm() << endl;*/

	// create a vector, which is associtated with regression coefficients
	Map<Vector<Float, Dynamic>> b(regressionCoefficients, columnCount);

	// create a vector, which is associated with prediction data 
	Map<Vector<Float, Dynamic>> prediction(predictionDataPtr, rowCount);

	// PLS1 algorithm routine

	Matrix<Float, Dynamic, Dynamic, ColMajor> W(columnCount, componentsCount);

	Matrix<Float, Dynamic, Dynamic, ColMajor> P(columnCount, componentsCount);

	Matrix<Float, Dynamic, Dynamic, ColMajor> T(rowCount, componentsCount);

	Vector<Float, Dynamic> normTau(componentsCount);

	Vector<Float, Dynamic> q(componentsCount);

	Vector<Float, Dynamic> normV(componentsCount);

	// PLS1 algorithm: see Algorithm 2 in https://doi.org/10.1002/cem.2589

	Vector<Float, Dynamic> w = (X.transpose() * y);

	normV(0) = w.norm();

	// prevent division by zero
	if (normV(0) == static_cast<Float>(0))
		return METHOD_ERROR;

	w = w / normV(0);

	W.col(0) = w;

	Vector<Float, Dynamic> t = X * w;

	normTau(0) = t.norm();

	// prevent division by zero
	if (normTau(0) == static_cast<Float>(0))
		return METHOD_ERROR;

	t = t / normTau(0);

	T.col(0) = t;

	Vector<Float, Dynamic> p = X.transpose() * t;

	P.col(0) = p;

	q(0) = t.transpose() * y;

	for (int a = 1; a < componentsCount; a++)
	{
		w = normV(a - 1) * (w - p / normTau(a - 1));

		normV(a) = w.norm();

		// prevent division by zero
		if (normV(a) == static_cast<Float>(0))
			return METHOD_ERROR;

		w = w / normV(a);

		W.col(a) = w;

		t = X * w;

		t = t - T.leftCols(a) * (T.leftCols(a).transpose() * t);

		normTau(a) = t.norm();

		// prevent division by zero
		if (normTau(a) == static_cast<Float>(0))
			return METHOD_ERROR;

		t = t / normTau(a);

		T.col(a) = t;

		p = X.transpose() * t;

		P.col(a) = p;

		q(a) = t.transpose() * y;
	} // for a	

	  // compute coefficients of regression
	Matrix<Float, Dynamic, Dynamic> H = P.transpose() * W;

	// chech existence of inverse matrix
	if (H.determinant() == static_cast<Float>(0))
		return METHOD_ERROR;

	b = W * H.inverse() * q;

	for (int i = 0; i < columnCount; i++)
		b(i) *= stdDevY / stdDevX(i);

	//cout << "\nb:\n" << b << endl;

	//cout << "\nq:\n" << q << endl;

	//cout << "\nD:\n" << D << endl;

	prediction = D * b;	

	/*cout << "\nP:\n" << P << endl;
	cout << "\nT:\n" << T << endl;
	cout << "\nW:\n" << W << endl;*/

	//cout << "\nprediction\n" << prediction << endl;

	return NO_ERROR;
} // partialLeastSquare_norm

// Maximum absolute deviation between arrays
Float pls::mad(Float * arr1, Float * arr2, const int length) noexcept
{
	// Solution using Eigen: nice, but additional structures are created! 
	/*Map<Vector<Float, Dynamic>> vec1(arr1, length);
	Map<Vector<Float, Dynamic>> vec2(arr2, length);
	return ((vec1 - vec2).cwiseAbs()).maxCoeff();*/

	// Naive solution
	Float result = fabs(arr1[0] - arr2[0]);

	for (int i = 1; i < length; i++)
		result = fmax(result, fabs(arr1[i] - arr2[i]));

	return result;
} // mad

/* Partial Least Square (PLS1) - extended version: scores data is provided.
      predictorColumnsDataPtr - data from columns that are used for prediction (X)
      rowCount - number of rows
	  columnCount - number of columns
	  responseColumnDataPtr - data from column that is predicted, i.e. responce (Y)
	  componentsCount - number of components that extracted in PLS (A)
	  predictionDataPtr - prediction obtained using PLS (its size is equal to the size of responce)
	  regressionCoefficientsPtr - coeffcient of linear regression that are computed (their size is eqaul to the number of columns) (b)
	  predictorScoresPtr - scores of predectors (T)
	  responceScoresPtr - scores of response (U)
*/
int pls::partialLeastSquareExtended(Float * predictorColumnsDataPtr,
	const int rowCount,
	const int columnCount,
	Float * responseColumnDataPtr,
	const int componentsCount,
	Float * predictionDataPtr,
	Float * regressionCoefficientsPtr,
	Float * predictorScoresPtr,
	Float * responceScoresPtr) noexcept
{
	// check correctness of arguments
	if (componentsCount <= 0 || componentsCount > columnCount)
		return UNCORRECT_ARGUMENTS_ERROR;

	// Further, notation from the paper https://doi.org/10.1002/cem.2589 is used (see Algorithm 2).

	// create matrix, which is associated with predictor data
	Map < Matrix<Float, Dynamic, Dynamic, ColMajor>> D(predictorColumnsDataPtr, rowCount, columnCount);

	// compute mean value of each column of D
	Vector<Float, Dynamic> mu = D.colwise().mean();
	
	// mean-centered version of D
	Matrix<Float, Dynamic, Dynamic, ColMajor> X = D.rowwise() - mu.transpose();
	
	// standard deviations of X
	Vector<Float, Dynamic> stdDevX(columnCount);
		
	Float rowCountSqrt = sqrt(static_cast<Float>(rowCount));

	// normalizing X
	for (int i = 0; i < columnCount; i++)
	{
		stdDevX(i) = X.col(i).norm() / rowCountSqrt;
		X.col(i) = X.col(i) / stdDevX(i);
	}	

	// create a vector, which is associated with responce or predicted data 
	Map<Vector<Float, Dynamic>> ySource(responseColumnDataPtr, rowCount);

	// mean value of Y: Eigen vector is used in order to provide broadcasting
	Vector<Float, 1> meanY;
	meanY(0) = ySource.mean();

	// centering Y
	Vector<Float, Dynamic> y = ySource.rowwise() - meanY;

	// standard deviation of Y normalizing Y
	Float stdDevY = sqrt(y.squaredNorm() / rowCount);
	y /= stdDevY;
	
	// create a vector, which is associtated with regression coefficients
	Map<Vector<Float, Dynamic>> b(regressionCoefficientsPtr, columnCount);

	// create a vector, which is associated with prediction data 
	Map<Vector<Float, Dynamic>> prediction(predictionDataPtr, rowCount);

	// PLS1 matrices

	// weights matrix, W
	Matrix<Float, Dynamic, Dynamic, ColMajor> W(columnCount, componentsCount);

	// X-loadings matrix, P
	Matrix<Float, Dynamic, Dynamic, ColMajor> P(columnCount, componentsCount);

	// X-scores, T
	Map<Matrix<Float, Dynamic, Dynamic, ColMajor>> T(predictorScoresPtr, rowCount, componentsCount);

	// Y-scores, U
	Map<Matrix<Float, Dynamic, Dynamic, ColMajor>> U(responceScoresPtr, rowCount, componentsCount);

	// Y-loadings, q
	Vector<Float, Dynamic> q(componentsCount);

	// PLS1 routine auxiliry vectors
	Vector<Float, Dynamic> normTau(componentsCount);
	Vector<Float, Dynamic> normV(componentsCount);

	// PLS1 algorithm: see Algorithm 2 in https://doi.org/10.1002/cem.2589
		
	Vector<Float, Dynamic> w = (X.transpose() * y);

	normV(0) = w.norm();

	// prevent division by zero
	if (normV(0) == static_cast<Float>(0))
		return METHOD_ERROR;

	w = w / normV(0);

	W.col(0) = w;

	Vector<Float, Dynamic> t = X * w;

	normTau(0) = t.norm();

	// prevent division by zero
	if (normTau(0) == static_cast<Float>(0))
		return METHOD_ERROR;

	t = t / normTau(0);

	T.col(0) = t;

	Vector<Float, Dynamic> p = X.transpose() * t;

	P.col(0) = p;

	q(0) = t.transpose() * y;

	for (int a = 1; a < componentsCount; a++)
	{
		w = normV(a - 1) * (w - p / normTau(a - 1));

		normV(a) = w.norm();

		// prevent division by zero
		if (normV(a) == static_cast<Float>(0))
			return METHOD_ERROR;

		w = w / normV(a);

		W.col(a) = w;

		t = X * w;

		t = t - T.leftCols(a) * (T.leftCols(a).transpose() * t);

		normTau(a) = t.norm();

		// prevent division by zero
		if (normTau(a) == static_cast<Float>(0))
			return METHOD_ERROR;

		t = t / normTau(a);

		T.col(a) = t;

		p = X.transpose() * t;

		P.col(a) = p;

		q(a) = t.transpose() * y;
	} // for a	

	// compute Y-scores
	U = y * q.transpose() / q.squaredNorm();	

	// compute coefficients of regression
	Matrix<Float, Dynamic, Dynamic> H = P.transpose() * W;

	// chech existence of inverse matrix
	if (H.determinant() == static_cast<Float>(0))
		return METHOD_ERROR;

	// auxiliry matrix
	Matrix<Float, Dynamic, Dynamic> Wstar = W * H.inverse();
		
	// compute regression coefficients
	b = Wstar * q;

	// ... also, we take into account a normalizing
	for (int i = 0; i < columnCount; i++)
		b(i) *= stdDevY / stdDevX(i);

	// compute predictions
	prediction = D * b;

	// Remove the following comments in order to print and verify results
	//cout << "\nW_star:\n" << Wstar << endl;	
	//cout << "\nU:\n" << U << endl;	
	//cout << "\nb:\n" << b << endl;
	//cout << "\nq:\n" << q << endl;
	//cout << "\nD:\n" << D << endl;	
	//cout << "\nP:\n" << P << endl;
	//cout << "\nT:\n" << T << endl;
	//cout << "\nT.tr * T:\n" << T.transpose() * T << endl; // this must be identity matrix
	//cout << "\nW:\n" << W << endl;
	//cout << "\nW.tr * W:\n" << W.transpose() * W << endl; // this must be identity matrix
	//cout << "\nprediction\n" << prediction << endl;

	return NO_ERROR;
} // partialLeastSquareExtended

