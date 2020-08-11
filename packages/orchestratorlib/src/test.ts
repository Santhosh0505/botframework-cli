/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as path from 'path';

import {IConfusionMatrix} from '@microsoft/bf-dispatcher';
import {MultiLabelConfusionMatrixSubset} from '@microsoft/bf-dispatcher';

import {PredictionScoreStructure}  from './predictionscorestructure';

import {LabelResolver} from './labelresolver';
import {OrchestratorHelper} from './orchestratorhelper';

import {Utility} from './utility';

export class OrchestratorTest {
  public static readonly testingSetScoresOutputFilename: string = 'orchestrator_testing_set_scores.txt';

  public static readonly testingSetSummaryHtmlOutputFilename: string = 'orchestrator_testing_set_summary.html';

  public static readonly testingSetLabelsOutputFilename: string = 'orchestrator_testing_set_labels.txt';

  // eslint-disable-next-line complexity
  // eslint-disable-next-line max-params
  public static async runAsync(
    nlrPath: string, inputPath: string, testPath: string, outputPath: string,
    ambiguousClosenessParameter: number,
    lowConfidenceScoreThresholdParameter: number,
    multiLabelPredictionThresholdParameter: number,
    unknownLabelPredictionThresholdParameter: number): Promise<void> {
    // ---- NOTE ---- process arguments
    if (Utility.isEmptyString(inputPath)) {
      Utility.debuggingThrow(`Please provide path to an input .blu file, CWD=${process.cwd()}, called from OrchestratorTest.runAsync()`);
    }
    if (Utility.isEmptyString(testPath)) {
      Utility.debuggingThrow(`Please provide a test file, CWD=${process.cwd()}, called from OrchestratorTest.runAsync()`);
    }
    if (Utility.isEmptyString(outputPath)) {
      Utility.debuggingThrow(`Please provide an output directory, CWD=${process.cwd()}, called from OrchestratorTest.runAsync()`);
    }
    if (Utility.isEmptyString(nlrPath)) {
      Utility.debuggingThrow(`The nlrPath argument is empty, CWD=${process.cwd()}, called from OrchestratorTest.runAsync()`);
    }
    nlrPath = path.resolve(nlrPath);
    const ambiguousCloseness: number = ambiguousClosenessParameter;
    const lowConfidenceScoreThreshold: number = lowConfidenceScoreThresholdParameter;
    const multiLabelPredictionThreshold: number = multiLabelPredictionThresholdParameter;
    const unknownLabelPredictionThreshold: number = unknownLabelPredictionThresholdParameter;
    Utility.debuggingLog(`inputPath=${inputPath}`);
    Utility.debuggingLog(`testPath=${testPath}`);
    Utility.debuggingLog(`outputPath=${outputPath}`);
    Utility.debuggingLog(`nlrPath=${nlrPath}`);
    Utility.debuggingLog(`ambiguousCloseness=${ambiguousCloseness}`);
    Utility.debuggingLog(`lowConfidenceScoreThreshold=${lowConfidenceScoreThreshold}`);
    Utility.debuggingLog(`multiLabelPredictionThreshold=${multiLabelPredictionThreshold}`);
    Utility.debuggingLog(`unknownLabelPredictionThreshold=${unknownLabelPredictionThreshold}`);
    // ---- NOTE ---- load the training set
    const trainingFile: string = inputPath;
    if (!Utility.exists(trainingFile)) {
      Utility.debuggingThrow(`training set file does not exist, trainingFile=${trainingFile}`);
    }
    const testingSetScoresOutputFilename: string = path.join(outputPath, OrchestratorTest.testingSetScoresOutputFilename);
    const testingSetSummaryHtmlOutputFilename: string = path.join(outputPath, OrchestratorTest.testingSetSummaryHtmlOutputFilename);
    const testingSetLabelsOutputFilename: string = path.join(outputPath, OrchestratorTest.testingSetLabelsOutputFilename);
    // ---- NOTE ---- create a LabelResolver object.
    Utility.debuggingLog('OrchestratorTest.runAsync(), ready to call LabelResolver.createWithSnapshotAsync()');
    await LabelResolver.createWithSnapshotAsync(nlrPath, trainingFile);
    Utility.debuggingLog('OrchestratorTest.runAsync(), after calling LabelResolver.createWithSnapshotAsync()');
    // ---- NOTE ---- process the training set, retrieve labels
    let processedUtteranceLabelsMap: {
      'utteranceLabelsMap': { [id: string]: string[] };
      'utteranceLabelDuplicateMap': Map<string, Set<string>>; } = await OrchestratorHelper.getUtteranceLabelsMap(trainingFile, false);
    const trainingSetUtterancesLabelsMap: { [id: string]: string[] } = processedUtteranceLabelsMap.utteranceLabelsMap;
    // ---- NOTE-NO-NEED ---- const trainingSetUtterancesDuplicateLabelsMap: Map<string, Set<string>> = processedUtteranceLabelsMap.utteranceLabelDuplicateMap;
    Utility.debuggingLog('OrchestratorTest.runAsync(), after calling OrchestratorHelper.getUtteranceLabelsMap() for training set');
    const trainingSetLabels: string[] =
      [...Object.values(trainingSetUtterancesLabelsMap)].reduce(
        (accumulant: string[], entry: string[]) => accumulant.concat(entry), []);
    const trainingSetLabelSet: Set<string> =
      new Set<string>(trainingSetLabels);
    // ---- NOTE ---- process the testing set.
    processedUtteranceLabelsMap = await OrchestratorHelper.getUtteranceLabelsMap(testPath, false);
    Utility.processUnknowLabelsInUtteranceLabelsMapUsingLabelSet(processedUtteranceLabelsMap, trainingSetLabelSet);
    const utteranceLabelsMap: { [id: string]: string[] } = processedUtteranceLabelsMap.utteranceLabelsMap;
    const utteranceLabelDuplicateMap: Map<string, Set<string>> = processedUtteranceLabelsMap.utteranceLabelDuplicateMap;
    Utility.debuggingLog('OrchestratorTest.runAsync(), after calling OrchestratorHelper.getUtteranceLabelsMap() for testing set');
    // Utility.debuggingLog(`OrchestratorTest.runAsync(), JSON.stringify(utteranceLabelsMap)=${JSON.stringify(utteranceLabelsMap)}`);
    // ---- Utility.debuggingLog(`OrchestratorTest.runAsync(), JSON.stringify(Utility.convertStringKeyGenericSetNativeMapToDictionary<string>(utteranceLabelDuplicateMap))=${JSON.stringify(Utility.convertStringKeyGenericSetNativeMapToDictionary<string>(utteranceLabelDuplicateMap))}`);
    Utility.debuggingLog(`OrchestratorTest.runAsync(), number of unique utterances=${Object.keys(utteranceLabelsMap).length}`);
    Utility.debuggingLog(`OrchestratorTest.runAsync(), number of duplicate utterance/label pairs=${utteranceLabelDuplicateMap.size}`);
    if (Object.entries(utteranceLabelsMap).length <= 0) {
      Utility.debuggingThrow('there is no example, something wrong?');
    }
    // ---- NOTE ---- integrated step to produce analysis reports.
    Utility.debuggingLog('OrchestratorTest.runAsync(), ready to call Utility.resetLabelResolverSettingIgnoreSameExample("false")');
    Utility.resetLabelResolverSettingIgnoreSameExample(false);
    Utility.debuggingLog('OrchestratorTest.runAsync(), finished calling Utility.resetLabelResolverSettingIgnoreSameExample()');
    Utility.debuggingLog('OrchestratorTest.runAsync(), ready to call Utility.generateEvaluationReport()');
    const evaluationOutput: {
      'evaluationReportLabelUtteranceStatistics': {
        'evaluationSummary': string;
        'labelArrayAndMap': {
          'stringArray': string[];
          'stringMap': {[id: string]: number};};
        'labelStatisticsAndHtmlTable': {
          'labelUtterancesMap': { [id: string]: string[] };
          'labelUtterancesTotal': number;
          'labelStatistics': string[][];
          'labelStatisticsHtml': string;};
        'utteranceStatisticsAndHtmlTable': {
          'utteranceStatisticsMap': {[id: number]: number};
          'utteranceStatistics': [string, number][];
          'utteranceCount': number;
          'utteranceStatisticsHtml': string;};
        'utterancesMultiLabelArrays': [string, string][];
        'utterancesMultiLabelArraysHtml': string;
        'utteranceLabelDuplicateHtml': string; };
      'evaluationReportAnalyses': {
        'evaluationSummary': string;
        'ambiguousAnalysis': {
          'scoringAmbiguousUtterancesArrays': string[][];
          'scoringAmbiguousUtterancesArraysHtml': string;
          'scoringAmbiguousUtteranceSimpleArrays': string[][];};
        'misclassifiedAnalysis': {
          'scoringMisclassifiedUtterancesArrays': string[][];
          'scoringMisclassifiedUtterancesArraysHtml': string;
          'scoringMisclassifiedUtterancesSimpleArrays': string[][];};
        'lowConfidenceAnalysis': {
          'scoringLowConfidenceUtterancesArrays': string[][];
          'scoringLowConfidenceUtterancesArraysHtml': string;
          'scoringLowConfidenceUtterancesSimpleArrays': string[][];};
        'confusionMatrixAnalysis': {
          'confusionMatrix': IConfusionMatrix;
          'multiLabelConfusionMatrixSubset': MultiLabelConfusionMatrixSubset;
          'predictingConfusionMatrixOutputLines': string[][];
          'confusionMatrixMetricsHtml': string;
          'confusionMatrixAverageMetricsHtml': string;}; };
      'predictionScoreStructureArray': PredictionScoreStructure[];
      'scoreOutputLines': string[][];
    } =
    Utility.generateEvaluationReport(
      trainingSetLabels,
      utteranceLabelsMap,
      utteranceLabelDuplicateMap,
      ambiguousCloseness,
      lowConfidenceScoreThreshold,
      multiLabelPredictionThreshold,
      unknownLabelPredictionThreshold);
    if (Utility.toPrintDetailedDebuggingLogToConsole) {
      Utility.debuggingLog(`evaluationOutput=${Utility.jsonStringify(evaluationOutput)}`);
    }
    Utility.debuggingLog('OrchestratorTest.runAsync(), finished calling Utility.generateEvaluationReport()');
    // ---- NOTE ---- integrated step to produce analysis report output files.
    Utility.debuggingLog('OrchestratorTest.runAsync(), ready to call Utility.generateEvaluationReportFiles()');
    Utility.generateEvaluationReportFiles(
      evaluationOutput.evaluationReportLabelUtteranceStatistics.labelArrayAndMap.stringArray,
      evaluationOutput.scoreOutputLines,
      evaluationOutput.evaluationReportAnalyses.evaluationSummary,
      testingSetLabelsOutputFilename,
      testingSetScoresOutputFilename,
      testingSetSummaryHtmlOutputFilename);
    Utility.debuggingLog('OrchestratorTest.runAsync(), finished calling Utility.generateEvaluationReportFiles()');
    if (Utility.toPrintDetailedDebuggingLogToConsole) {
      Utility.debuggingLog(`evaluationOutput=${Utility.jsonStringify(evaluationOutput)}`);
    }
    // ---- NOTE ---- THE END
    Utility.debuggingLog('OrchestratorTest.runAsync(), THE END');
  }
}
