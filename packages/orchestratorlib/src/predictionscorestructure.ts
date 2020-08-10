/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {Result}  from './result';

import {PredictionStructure}  from './predictionstructure';

export class PredictionScoreStructure extends PredictionStructure {
  // eslint-disable-next-line max-params
  constructor(
    utterance: string,
    labelsPredictedEvaluation: number, // ---- 0: TP, 1, FN, 2: FP, 3: TN
    labels: string[],
    labelsConcatenated: string,
    labelsIndexes: number[],
    labelsPredicted: string[],
    labelsPredictedConcatenated: string,
    labelsPredictedScore: number,
    labelsPredictedIndexes: number[],
    labelsPredictedClosestText: string[],
    scoreResultArray: Result[],
    scoreArray: number[],
    predictedScoreStructureHtmlTable: string,
    labelsScoreStructureHtmlTable: string) {
    super(
      utterance,
      labelsPredictedEvaluation,
      labels,
      labelsConcatenated,
      labelsIndexes,
      labelsPredicted,
      labelsPredictedConcatenated,
      labelsPredictedIndexes);
    this.labelsPredictedScore = labelsPredictedScore;
    this.labelsPredictedClosestText = labelsPredictedClosestText;
    this.scoreResultArray = scoreResultArray;
    this.scoreArray = scoreArray;
    this.predictedScoreStructureHtmlTable = predictedScoreStructureHtmlTable;
    this.labelsScoreStructureHtmlTable = labelsScoreStructureHtmlTable;
  }

  public toObject(): {
    'utterance': string;
    'labelsPredictedEvaluation': number; // ---- 0: TP, 1, FN, 2: FP, 3: TN
    'labels': string[];
    'labelsConcatenated': string;
    'labelsIndexes': number[];
    'labelsPredicted': string[];
    'labelsPredictedConcatenated': string;
    'labelsPredictedScore': number;
    'labelsPredictedIndexes': number[];
    'labelsPredictedClosestText': string[];
    'scoreResultArray': Result[];
    'scoreArray': number[];
    'predictedScoreStructureHtmlTable': string;
    'labelsScoreStructureHtmlTable': string; } {
    return {
      utterance: this.utterance,
      labelsPredictedEvaluation: this.labelsPredictedEvaluation, // ---- 0: TP, 1, FN, 2: FP, 3: TN
      labels: this.labels,
      labelsConcatenated: this.labelsConcatenated,
      labelsIndexes: this.labelsIndexes,
      labelsPredicted: this.labelsPredicted,
      labelsPredictedConcatenated: this.labelsPredictedConcatenated,
      labelsPredictedScore: this.labelsPredictedScore,
      labelsPredictedIndexes: this.labelsPredictedIndexes,
      labelsPredictedClosestText: this.labelsPredictedClosestText,
      scoreResultArray: this.scoreResultArray,
      scoreArray: this.scoreArray,
      predictedScoreStructureHtmlTable: this.predictedScoreStructureHtmlTable,
      labelsScoreStructureHtmlTable: this.labelsScoreStructureHtmlTable,
    };
  }

  public labelsPredictedScore: number;

  public labelsPredictedClosestText: string[];

  public scoreResultArray: Result[];

  public scoreArray: number[];

  public predictedScoreStructureHtmlTable: string;

  public labelsScoreStructureHtmlTable: string;
}
