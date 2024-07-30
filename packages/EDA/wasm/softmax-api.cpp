#include "softmax.h"

#include <emscripten.h>

// The following provides convenient naming of the exported functions.
extern "C" {
	int fitSoftmax(
	  float * features, int featuresRowCount, int featuresColCount,
	  float * avgs, int avgsCount,
	  float * stdevs, int stdevsCount,
	  int * targets, int targetsCount,
	  int classesCount, int iterCount, float learningRate, float penalty, float tolerance,
	  int paramsRows, int paramsCols,
	  float * params, int paramsRowCount, int paramsColCount) noexcept;
}

//name: fitSoftmax
//input: column_list features
//input: column featureAvgs
//input: column featureStdDevs
//input: column targets
//input: int classesCount
//input: int iterCount
//input: double learningRate
//input: double penalty
//input: double tolerance
//input: int paramsRows
//input: int paramsCols
//output: column_list params [new(paramsRows, paramsCols)]
//output: dataframe result [params]
EMSCRIPTEN_KEEPALIVE
int fitSoftmax(
	float * features, int featuresRowCount, int featuresColCount,
	float * avgs, int avgsCount,
	float * stdevs, int stdevsCount,
	int * targets, int targetsCount,
	int classesCount, int iterCount, float learningRate, float penalty, float tolerance,
	int paramsRows, int paramsCols,
	float * params, int paramsRowCount, int paramsColCount) noexcept
{
	if ((featuresRowCount != targetsCount) || (featuresColCount != avgsCount) || (featuresColCount != stdevsCount)
		|| (classesCount != paramsColCount) || (paramsRowCount != featuresColCount + 1))
		return softmax::INCORRECT_SIZES;

	if ((iterCount < 1) || (penalty < 0.0f) || (learningRate <= 0.0f) || (tolerance <= 0.0f))
		return softmax::ICORRECT_HYPER_PARAMS;

	return softmax::fitSoftmax(features, avgs, stdevs, targets, targetsCount, avgsCount, classesCount, iterCount, learningRate, penalty, tolerance, params);
}