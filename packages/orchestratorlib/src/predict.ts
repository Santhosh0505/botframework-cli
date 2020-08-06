/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as path from 'path';

import * as readline from 'readline';

import {MultiLabelConfusionMatrix} from '@microsoft/bf-dispatcher';
import {MultiLabelConfusionMatrixSubset} from '@microsoft/bf-dispatcher';

import {LabelResolver} from './labelresolver';
import {OrchestratorHelper} from './orchestratorhelper';

import {Example} from './example';
// import {Label} from './label';
import {LabelType} from './labeltype';
// import {OrchestratorHelper} from './orchestratorhelper';
// import {Result} from './result';
import {ScoreStructure} from './scorestructure';
// import {Span} from './span';

import {Utility} from './utility';

/* eslint-disable no-console */
export class OrchestratorPredict {
  static readonly commandprefix: string =
    'Please enter a commandlet, "h" for help > ';

  static readonly questionForUtterance: string =
    'Please enter an utterance > ';

  static readonly questionForCurrentIntentLabel: string =
    'Please enter a "current" intent label > ';

  static readonly questionForNewIntentLabel: string =
    'Please enter a "new" intent label > ';

  static readonly questionForUtteranceLabelsFromDuplicates: string =
    'Please enter an index from the Duplicates report > ';

  static readonly questionForUtteranceLabelsFromAmbiguous: string =
    'Please enter an index from the Ambiguous report > ';

  static readonly questionForUtteranceLabelsFromMisclassified: string =
    'Please enter an index from the Misclassified report > ';

  static readonly questionForUtteranceLabelsFromLowConfidence: string =
    'Please enter an index from the Low-Confidence report > ';

  static readonly questionForAmbiguousThreshold: string =
    'Please enter a threshold for generating the Ambiguous report > ';

  static readonly questionForLowConfidenceThreshold: string =
    'Please enter a threshold for generating the Low-Confidence report > ';

  static readonly questionForMultiLabelPredictionThreshold: string =
    'Please enter a threshold for multi-label prediction > ';

  static readonly questionForunknownLabelPredictionThreshold: string =
    'Please enter a threshold for unknow label prediction > ';

  protected inputPath: string = '';

  protected outputPath: string = '';

  protected nlrPath: string = '';

  protected ambiguousCloseness: number = Utility.DefaultAmbiguousClosenessParameter;

  protected lowConfidenceScoreThreshold: number = Utility.DefaultLowConfidenceScoreThresholdParameter;

  protected multiLabelPredictionThreshold: number = Utility.DefaultMultiLabelPredictionThresholdParameter;

  protected unknownLabelPredictionThreshold: number = Utility.DefaultUnknownLabelPredictionThresholdParameter;

  protected trainingFile: string = '';

  protected predictingSetScoreOutputFilename: string = '';

  protected predictingSetSummaryOutputFilename: string = '';

  protected predictingLabelsOutputFilename: string = '';

  protected predictingSetSnapshotFilename: string = '';

  protected labelResolver: any;

  protected currentUtterance: string = '';

  protected currentIntentLabels: string[] = [];

  protected newIntentLabels: string[] = [];

  protected currentLabelArrayAndMap: {
    'stringArray': string[];
    'stringMap': {[id: string]: number};} = {
      stringArray: [],
      stringMap: {}};

  protected currentUtteranceLabelsMap: { [id: string]: string[] } = {};

  protected currentUtteranceLabelDuplicateMap: Map<string, Set<string>> = new Map<string, Set<string>>();

  protected currentEvaluationOutput: {
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
        'confusionMatrix': MultiLabelConfusionMatrix;
        'multiLabelConfusionMatrixSubset': MultiLabelConfusionMatrixSubset;
        'scoringConfusionMatrixOutputLines': string[][];
        'confusionMatrixMetricsHtml': string;
        'confusionMatrixAverageMetricsHtml': string;}; };
    'scoreStructureArray': ScoreStructure[];
    'scoreOutputLines': string[][];
  } = Utility.generateEmptyEvaluationReport();

  /* eslint-disable max-params */
  /* eslint-disable complexity */
  constructor(
    nlrPath: string, inputPath: string, outputPath: string,
    ambiguousClosenessParameter: number,
    lowConfidenceScoreThresholdParameter: number,
    multiLabelPredictionThresholdParameter: number,
    unknownLabelPredictionThresholdParameter: number) {
    // ---- NOTE ---- process arguments
    // if (Utility.isEmptyString(inputPath)) {
    //   Utility.debuggingThrow(`Please provide path to an input .blu file, CWD=${process.cwd()}, from OrchestratorPredict.constructor()`);
    // }
    if (Utility.isEmptyString(outputPath)) {
      Utility.debuggingThrow('Please provide an output directory');
    }
    // if (Utility.isEmptyString(nlrPath)) {
    //   Utility.debuggingThrow('The nlrPath argument is empty');
    // }
    if (inputPath) {
      inputPath = path.resolve(inputPath);
      if (!Utility.exists(inputPath)) {
        Utility.debuggingThrow(`The input file path "${inputPath}" does not exist!`);
      }
    } else {
      inputPath = '';
    }
    if (nlrPath) {
      nlrPath = path.resolve(nlrPath);
      if (!Utility.exists(nlrPath)) {
        Utility.debuggingThrow(`The input model file path "${nlrPath}" does not exist!`);
      }
    } else {
      nlrPath = '';
    }
    Utility.debuggingLog(`inputPath=${inputPath}`);
    Utility.debuggingLog(`outputPath=${outputPath}`);
    Utility.debuggingLog(`nlrPath=${nlrPath}`);
    Utility.debuggingLog(`ambiguousClosenessParameter=${ambiguousClosenessParameter}`);
    Utility.debuggingLog(`lowConfidenceScoreThresholdParameter=${lowConfidenceScoreThresholdParameter}`);
    Utility.debuggingLog(`multiLabelPredictionThresholdParameter=${multiLabelPredictionThresholdParameter}`);
    Utility.debuggingLog(`unknownLabelPredictionThresholdParameter=${unknownLabelPredictionThresholdParameter}`);
    this.inputPath = inputPath;
    this.outputPath = outputPath;
    this.nlrPath = nlrPath;
    this.ambiguousCloseness = ambiguousClosenessParameter;
    this.lowConfidenceScoreThreshold = lowConfidenceScoreThresholdParameter;
    this.multiLabelPredictionThreshold = multiLabelPredictionThresholdParameter;
    this.unknownLabelPredictionThreshold = unknownLabelPredictionThresholdParameter;
    // ---- NOTE ---- load the training set
    this.trainingFile = this.inputPath;
    // if (!Utility.exists(this.trainingFile)) {
    //   Utility.debuggingThrow(`training set file does not exist, trainingFile=${trainingFile}`);
    // }
    this.predictingSetScoreOutputFilename = path.join(this.outputPath, 'orchestrator_predicting_set_scores.txt');
    this.predictingSetSummaryOutputFilename = path.join(this.outputPath, 'orchestrator_predicting_set_summary.html');
    this.predictingLabelsOutputFilename = path.join(this.outputPath, 'orchestrator_predicting_set_labels.txt');
    this.predictingSetSnapshotFilename = path.join(this.outputPath, 'orchestrator_predicting_training_set.blu');
  }

  public getPredictingSetScoreOutputFilename(): string {
    return this.predictingSetScoreOutputFilename;
  }

  public getPredictingSetSummaryOutputFilename(): string {
    return this.predictingSetSummaryOutputFilename;
  }

  public getPredictingLabelsOutputFilename(): string {
    return this.predictingLabelsOutputFilename;
  }

  public getPredictingSetSnapshotFilename(): string {
    return this.predictingSetSnapshotFilename;
  }

  public async buildLabelResolver(): Promise<void> {
    // ---- NOTE ---- create a LabelResolver object.
    Utility.debuggingLog('OrchestratorPredict.buildLabelResolver(), ready to create a LabelResolver object');
    if (Utility.exists(this.trainingFile)) {
      Utility.debuggingLog('OrchestratorPredict.buildLabelResolver(), ready to call LabelResolver.createWithSnapshotAsync()');
      this.labelResolver = await LabelResolver.createWithSnapshotAsync(this.nlrPath, this.trainingFile);
    } else {
      Utility.debuggingLog('OrchestratorPredict.buildLabelResolver(), ready to call LabelResolver.createAsync()');
      this.labelResolver = await LabelResolver.createAsync(this.nlrPath);
    }
    Utility.debuggingLog('OrchestratorPredict.buildLabelResolver(), after creating a LabelResolver object');
  }

  public static async runAsync(
    nlrPath: string, inputPath: string, outputPath: string,
    ambiguousClosenessParameter: number,
    lowConfidenceScoreThresholdParameter: number,
    multiLabelPredictionThresholdParameter: number,
    unknownLabelPredictionThresholdParameter: number): Promise<number> {
    const orchestratorPredict: OrchestratorPredict = new OrchestratorPredict(
      nlrPath,
      inputPath,
      outputPath,
      ambiguousClosenessParameter,
      lowConfidenceScoreThresholdParameter,
      multiLabelPredictionThresholdParameter,
      unknownLabelPredictionThresholdParameter);
    // ---- NOTE ---- create a LabelResolver object.
    await orchestratorPredict.buildLabelResolver();
    // ---- NOTE ---- enter the command loop.
    return orchestratorPredict.commandLetLoop();
  }

  public async commandLetLoop(): Promise<number> {
    // ---- NOTE ---- need to dynamically create an 'interactive' object
    // ---- NOTE ---- and call close() when it's not needed, otherwise this resource cannot be
    // ---- NOTE ---- properly disposed of and a unit test on this object will hang.
    const interactive: readline.Interface = readline.createInterface(process.stdin, process.stdout);
    const question: any = function (prefix: string) {
      return new Promise((resolve: any, _reject: any) => {
        interactive.question(prefix, (answer: string) => {
          resolve(answer);
        });
      });
    };
    let command: string = '';
    // ---- NOTE ---- enter the interaction loop.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      this.displayInputs();
      // eslint-disable-next-line no-await-in-loop
      command = await question(OrchestratorPredict.commandprefix);
      command = command.trim();
      Utility.debuggingLog(`The command you entered is "${command}"`);
      if (command === 'q') {
        break;
      }
      switch (command) {
      case 'h': this.commandLetH();
        break;
      case 'd': this.commandLetD();
        break;
      case 's': this.commandLetS();
        break;
      // eslint-disable-next-line no-await-in-loop
      case 'u': await this.commandLetU(question);
        break;
      case 'cu': this.commandLetCU();
        break;
      // eslint-disable-next-line no-await-in-loop
      case 'i': await this.commandLetI(question);
        break;
      case 'ci': this.commandLetCI();
        break;
      // eslint-disable-next-line no-await-in-loop
      case 'ni': await this.commandLetNI(question);
        break;
      case 'cni': this.commandLetCNI();
        break;
      case 'f': this.commandLetF();
        break;
      case 'p': this.commandLetP();
        break;
      case 'v': this.commandLetV();
        break;
      // eslint-disable-next-line no-await-in-loop
      case 'vd': await this.commandLetVD(question);
        break;
      // eslint-disable-next-line no-await-in-loop
      case 'va': await this.commandLetVA(question);
        break;
      // eslint-disable-next-line no-await-in-loop
      case 'vm': await this.commandLetVM(question);
        break;
      // eslint-disable-next-line no-await-in-loop
      case 'vl': await this.commandLetVL(question);
        break;
      // eslint-disable-next-line no-await-in-loop
      case 'vat': await this.commandLetVAT(question);
        break;
      // eslint-disable-next-line no-await-in-loop
      case 'vlt': await this.commandLetVLT(question);
        break;
      // eslint-disable-next-line no-await-in-loop
      case 'vmt': await this.commandLetVMT(question);
        break;
      // eslint-disable-next-line no-await-in-loop
      case 'vut': await this.commandLetVUT(question);
        break;
      case 'a': this.commandLetA();
        break;
      case 'r': this.commandLetR();
        break;
      case 'c': this.commandLetC();
        break;
      case 'rl': this.commandLetRL();
        break;
      case 'n': this.commandLetN();
        break;
      default:
        console.log(`> Cannot recognize the command you just entered "${command}",`);
        console.log('> please type "h" for help!');
        break;
      }
    }
    // eslint-disable-next-line no-console
    console.log('> Bye!');
    interactive.close();
    return 0;
  }

  public commandLetH(): number {
    console.log('  Commandlets: h, q, d, s, u, cu, i, ci, ni, cni, q, p, v,');
    console.log('               vd, va, vm, vl, vat, vlt, vmt, vut, a, r, c, rl, n');
    console.log('    h   - print this help message');
    console.log('    q   - quit');
    console.log('    d   - display utterance, intent label array inputs, Orchestrator config,');
    console.log('          and the label-index map');
    console.log('    s   - show label-utterance statistics of the model examples');
    console.log('    u   - enter a new utterance and save it as the "current" utterance input');
    console.log('    cu  - clear the "current" utterance input');
    console.log('    i   - enter an intent and add it to the "current" intent label array input ');
    console.log('          (can be an index for retrieving a label from the label-index map)');
    console.log('    ci  - clear the "current" intent label array input');
    console.log('    ni  - enter an intent and add it to the "new" intent label array input ');
    console.log('          (can be an index for retrieving a label from the label-index map)');
    console.log('    cni - clear the "new" intent label array input');
    console.log('    f   - find the "current" utterance if it is already in the model example set');
    console.log('    p   - make a prediction on the "current" utterance input');
    console.log('    v   - validate the model and save analyses (validation report) to ');
    console.log(`          "${this.predictingSetSummaryOutputFilename}"`);
    console.log('    vd  - reference a validation Duplicates report ');
    console.log('          (previously generated by the "v" command) and enter an index');
    console.log('          for retrieving utterance/intents into "current"');
    console.log('    va  - reference a validation Ambiguous report ');
    console.log('          (previously generated by the "v" command) and enter an index');
    console.log('          for retrieving utterance/intents into "current"');
    console.log('    vm  - reference a validation Misclassified report and enter an index');
    console.log('          (previously generated by the "v" command) ');
    console.log('          for retrieving utterance/intents into "current"');
    console.log('    vl  - reference a validation LowConfidence report ');
    console.log('          (previously generated by the "v" command) and enter an index');
    console.log('          for retrieving utterance/intents into "current"');
    console.log('    vat - enter a new validation-report ambiguous closeness threshold');
    console.log('    vlt - enter a new validation-report low-confidence threshold');
    console.log('    vmt - enter a new multi-label threshold');
    console.log('    vut - enter a new unknown-label threshold');
    console.log('    a   - add the "current" utterance and intent labels to the model example set');
    console.log('    r   - remove the "current" utterance and intent labels from the model example set');
    console.log('    c   - remove the "current" utterance\'s intent labels and then ');
    console.log('          add it with the "new" intent labels to the model example set');
    console.log('    rl  - remove the "current" intent labels from the model example set');
    console.log('    n   - create a new snapshot of model examples and save it to ');
    console.log(`          "${this.predictingSetSnapshotFilename}"`);
    return 0;
  }

  public displayInputs(): void {
    console.log(`> "Current" utterance:          "${this.currentUtterance}"`);
    console.log(`> "Current" intent label array: "${this.currentIntentLabels}"`);
    console.log(`> "New"     intent label array: "${this.newIntentLabels}"`);
  }

  public commandLetD(): number {
    console.log(`> Ambiguous closeness:           ${this.ambiguousCloseness}`);
    console.log(`> Low-confidence closeness:      ${this.lowConfidenceScoreThreshold}`);
    console.log(`> Multi-label threshold:         ${this.multiLabelPredictionThreshold}`);
    console.log(`> Unknown-label threshold:       ${this.unknownLabelPredictionThreshold}`);
    const labelResolverConfig: any = Utility.getLabelResolverSettings(this.labelResolver);
    console.log(`> Orchestrator configuration:         ${labelResolverConfig}`);
    const labels: string[] = this.labelResolver.getLabels(LabelType.Intent);
    this.currentLabelArrayAndMap = Utility.buildStringIdNumberValueDictionaryFromStringArray(labels);
    console.log(`> Current label-index map: ${Utility.jsonStringify(this.currentLabelArrayAndMap.stringMap)}`);
    return 0;
  }

  public commandLetS(): number {
    this.currentUtteranceLabelsMap = {};
    this.currentUtteranceLabelDuplicateMap = new Map<string, Set<string>>();
    const examples: any = this.labelResolver.getExamples();
    if (examples.length <= 0) {
      console.log('> There is no example');
      return -1;
    }
    const labels: string[] = this.labelResolver.getLabels(LabelType.Intent);
    this.currentLabelArrayAndMap = Utility.buildStringIdNumberValueDictionaryFromStringArray(labels);
    Utility.examplesToUtteranceLabelMaps(
      examples,
      this.currentUtteranceLabelsMap,
      this.currentUtteranceLabelDuplicateMap);
    const labelStatisticsAndHtmlTable: {
      'labelUtterancesMap': { [id: string]: string[] };
      'labelUtterancesTotal': number;
      'labelStatistics': string[][];
      'labelStatisticsHtml': string;
    } = Utility.generateLabelStatisticsAndHtmlTable(
      this.currentUtteranceLabelsMap,
      this.currentLabelArrayAndMap);
    const labelUtteranceCount: { [id: string]: number } = {};
    Object.entries(labelStatisticsAndHtmlTable.labelUtterancesMap).forEach(
      (x: [string, string[]]) => {
        labelUtteranceCount[x[0]] = x[1].length;
      });
    console.log(`> Per-label #examples: ${Utility.jsonStringify(labelUtteranceCount)}`);
    console.log(`> Total #examples:${labelStatisticsAndHtmlTable.labelUtterancesTotal}`);
    return 0;
  }

  public async commandLetU(question: any): Promise<number> {
    return this.commandLetUwithEntry(await question(OrchestratorPredict.questionForUtterance));
  }

  public commandLetUwithEntry(entry: string): number {
    this.currentUtterance = entry;
    return 0;
  }

  public commandLetCU(): number {
    this.currentUtterance = '';
    return 0;
  }

  public async commandLetI(question: any): Promise<number> {
    return this.commandLetIwithEntry(await question(OrchestratorPredict.questionForCurrentIntentLabel));
  }

  public commandLetIwithEntry(entry: string): number {
    let label: string = entry;
    label = label.trim();
    const errorMessage: string = Utility.parseLabelResolverLabelEntry(
      this.labelResolver,
      label,
      this.currentIntentLabels);
    if (!Utility.isEmptyString(errorMessage)) {
      console.log(`ERROR: ${errorMessage}`);
      return -1;
    }
    return 0;
  }

  public commandLetCI(): number {
    this.currentIntentLabels = [];
    return 0;
  }

  public async commandLetNI(question: any): Promise<number> {
    return this.commandLetNIwithEntry(await question(OrchestratorPredict.questionForNewIntentLabel));
  }

  public commandLetNIwithEntry(entry: string): number {
    let label: string = entry;
    label = label.trim();
    const errorMessage: string = Utility.parseLabelResolverLabelEntry(
      this.labelResolver,
      label,
      this.newIntentLabels);
    if (!Utility.isEmptyString(errorMessage)) {
      console.log(`ERROR: ${errorMessage}`);
      return -1;
    }
    return 0;
  }

  public commandLetCNI(): number {
    this.newIntentLabels = [];
    return 0;
  }

  public commandLetF(): number {
    if (Object.keys(this.currentUtteranceLabelsMap).length <= 0) {
      console.log('ERROR: Please run \'s\' commandlet first scanning the model snapshot for querying');
      return -1;
    }
    if (Utility.isEmptyString(this.currentUtterance)) {
      console.log('ERROR: The "current" utterance is empty, nothing to query for.');
      return -2;
    }
    if (this.currentUtterance in this.currentUtteranceLabelsMap) {
      console.log(`> The "current" utterance '${this.currentUtterance}' is in the model and it's intent labels are '${this.currentUtteranceLabelsMap[this.currentUtterance]}'`);
    } else {
      console.log(`> The "current" utterance '${this.currentUtterance}' is not in the model.`);
    }
    return 0;
  }

  public commandLetP(): number {
    if (Utility.isEmptyString(this.nlrPath)) {
      console.log('> No model is loaded, cannot make a prediction.');
    }
    Utility.resetLabelResolverSettingIgnoreSameExample(this.labelResolver, false);
    const scoreResults: any = this.labelResolver.score(this.currentUtterance, LabelType.Intent);
    if (!scoreResults) {
      return -1;
    }
    console.log(`> Prediction:\n${Utility.jsonStringify(scoreResults)}`);
    return 0;
  }

  public commandLetV(): number {
    // ---- NOTE ---- process the training set.
    const labels: string[] = this.labelResolver.getLabels(LabelType.Intent);
    const utteranceLabelsMap: { [id: string]: string[] } = {};
    const utteranceLabelDuplicateMap: Map<string, Set<string>> = new Map<string, Set<string>>();
    const examples: any = this.labelResolver.getExamples();
    if (examples.length <= 0) {
      console.log('ERROR: There is no example in the training set, please add some.');
      return -1;
    }
    Utility.examplesToUtteranceLabelMaps(examples, utteranceLabelsMap, utteranceLabelDuplicateMap);
    // ---- NOTE ---- integrated step to produce analysis reports.
    Utility.debuggingLog('OrchestratorPredict.commandLetV(), ready to call Utility.resetLabelResolverSettingIgnoreSameExample()');
    Utility.resetLabelResolverSettingIgnoreSameExample(this.labelResolver, true);
    Utility.debuggingLog('OrchestratorPredict.commandLetV(), finished calling Utility.resetLabelResolverSettingIgnoreSameExample()');
    Utility.debuggingLog('OrchestratorPredict.commandLetV(), ready to call Utility.generateEvaluationReport()');
    this.currentEvaluationOutput = Utility.generateEvaluationReport(
      this.labelResolver,
      labels,
      utteranceLabelsMap,
      utteranceLabelDuplicateMap,
      this.ambiguousCloseness,
      this.lowConfidenceScoreThreshold,
      this.multiLabelPredictionThreshold,
      this.unknownLabelPredictionThreshold);
    // ---- NOTE ---- integrated step to produce analysis report output files.
    Utility.debuggingLog('OrchestratorTest.runAsync(), ready to call Utility.generateEvaluationReportFiles()');
    Utility.generateEvaluationReportFiles(
      this.currentEvaluationOutput.evaluationReportLabelUtteranceStatistics.labelArrayAndMap.stringArray,
      this.currentEvaluationOutput.scoreOutputLines,
      this.currentEvaluationOutput.evaluationReportAnalyses.evaluationSummary,
      this.getPredictingLabelsOutputFilename(),
      this.getPredictingSetScoreOutputFilename(),
      this.getPredictingSetSummaryOutputFilename());
    Utility.debuggingLog('OrchestratorTest.runAsync(), finished calling Utility.generateEvaluationReportFiles()');
    if (Utility.toPrintDetailedDebuggingLogToConsole) {
      Utility.debuggingLog(`this.currentEvaluationOutput=${Utility.jsonStringify(this.currentEvaluationOutput)}`);
    }
    Utility.debuggingLog('OrchestratorPredict.commandLetV(), finished calling Utility.generateEvaluationReport()');
    console.log(`> Leave-one-out cross validation is done and reports generated in '${this.predictingSetSummaryOutputFilename}'`);
    return 0;
  }

  public async commandLetVD(question: any): Promise<number> {
    return this.commandLetVDwithEntry(await question(OrchestratorPredict.questionForUtteranceLabelsFromDuplicates));
  }

  public commandLetVDwithEntry(entry: string): number {
    if (!this.currentEvaluationOutput) {
      console.log('ERROR: There is no validation report, please use the "v" command to create one');
      return -1;
    }
    const labelUtterancesTotal: number =
    this.currentEvaluationOutput.evaluationReportLabelUtteranceStatistics.labelStatisticsAndHtmlTable.labelUtterancesTotal;
    if (labelUtterancesTotal <= 0) {
      console.log('ERROR: There is no examples or there is no validation report, please use the "v" command to create one');
      return -2;
    }
    const utterancesMultiLabelArrays: [string, string][] =
    this.currentEvaluationOutput.evaluationReportLabelUtteranceStatistics.utterancesMultiLabelArrays;
    let indexInput: string = entry;
    indexInput = indexInput.trim();
    if (Utility.isEmptyString(indexInput)) {
      console.log('ERROR: Please enter an integer index to access the validation Duplicates entry');
      return -3;
    }
    if (Number.isInteger(Number(indexInput))) {
      const index: number = Number(indexInput);
      // eslint-disable-next-line max-depth
      if ((index < 0) || (index >= utterancesMultiLabelArrays.length)) {
        const errorMessage: string =
          ` The index "${index}" you entered is not in range, the array length is: ${utterancesMultiLabelArrays.length}`;
        console.log(`ERROR: ${errorMessage}`);
        return -4;
      }
      this.currentUtterance = utterancesMultiLabelArrays[index][0];
      this.currentIntentLabels = utterancesMultiLabelArrays[index][1].split(',');
    } else {
      console.log('> Please enter an integer index to access the validation Duplicates entry');
      return -5;
    }
    return 0;
  }

  public async commandLetVA(question: any): Promise<number> {
    return this.commandLetVAwithEntry(await question(OrchestratorPredict.questionForUtteranceLabelsFromAmbiguous));
  }

  public commandLetVAwithEntry(entry: string): number {
    if (!this.currentEvaluationOutput) {
      console.log('ERROR: There is no validation report, please use the "v" command to create one');
      return -1;
    }
    const labelUtterancesTotal: number =
    this.currentEvaluationOutput.evaluationReportLabelUtteranceStatistics.labelStatisticsAndHtmlTable.labelUtterancesTotal;
    if (labelUtterancesTotal <= 0) {
      console.log('ERROR: There is no examples or there is no validation report, please use the "v" command to create one');
      return -2;
    }
    const scoringAmbiguousUtterancesSimpleArrays: string[][] =
    this.currentEvaluationOutput.evaluationReportAnalyses.ambiguousAnalysis.scoringAmbiguousUtteranceSimpleArrays;
    let indexInput: string = entry;
    indexInput = indexInput.trim();
    if (Utility.isEmptyString(indexInput)) {
      console.log('ERROR: Please enter an integer index to access the validation Ambiguous entry');
      return -3;
    }
    if (Number.isInteger(Number(indexInput))) {
      const index: number = Number(indexInput);
      // eslint-disable-next-line max-depth
      if ((index < 0) || (index >= scoringAmbiguousUtterancesSimpleArrays.length)) {
        const errorMessage: string =
          ` The index "${index}" you entered is not in range, the array length is: ${scoringAmbiguousUtterancesSimpleArrays.length}`;
        console.log(`ERROR: ${errorMessage}`);
        return -4;
      }
      this.currentUtterance = scoringAmbiguousUtterancesSimpleArrays[index][0];
      this.currentIntentLabels = scoringAmbiguousUtterancesSimpleArrays[index][1].split(',');
    } else {
      console.log('ERROR: Please enter an integer index to access the validation Ambiguous entry');
      return -5;
    }
    return 0;
  }

  public async commandLetVM(question: any): Promise<number> {
    return this.commandLetVMwithEntry(await question(OrchestratorPredict.questionForUtteranceLabelsFromMisclassified));
  }

  public commandLetVMwithEntry(entry: string): number {
    if (!this.currentEvaluationOutput) {
      console.log('ERROR: There is no validation report, please use the "v" command to create one');
      return -1;
    }
    const labelUtterancesTotal: number =
    this.currentEvaluationOutput.evaluationReportLabelUtteranceStatistics.labelStatisticsAndHtmlTable.labelUtterancesTotal;
    if (labelUtterancesTotal <= 0) {
      console.log('ERROR: There is no examples or there is no validation report, please use the "v" command to create one');
      return -2;
    }
    const scoringMisclassifiedUtterancesSimpleArrays: string[][] =
    this.currentEvaluationOutput.evaluationReportAnalyses.misclassifiedAnalysis.scoringMisclassifiedUtterancesSimpleArrays;
    let indexInput: string = entry;
    indexInput = indexInput.trim();
    if (Utility.isEmptyString(indexInput)) {
      console.log('ERROR: Please enter an integer index to access the validation Misclassified entry');
      return -3;
    }
    if (Number.isInteger(Number(indexInput))) {
      const index: number = Number(indexInput);
      // eslint-disable-next-line max-depth
      if ((index < 0) || (index >= scoringMisclassifiedUtterancesSimpleArrays.length)) {
        const errorMessage: string =
          ` The index "${index}" you entered is not in range, the array length is: ${scoringMisclassifiedUtterancesSimpleArrays.length}`;
        console.log(`ERROR: ${errorMessage}`);
        return -4;
      }
      this.currentUtterance = scoringMisclassifiedUtterancesSimpleArrays[index][0];
      this.currentIntentLabels = scoringMisclassifiedUtterancesSimpleArrays[index][1].split(',');
    } else {
      console.log('ERROR: Please enter an integer index to access the validation Misclassified entry');
      return -5;
    }
    return 0;
  }

  public async commandLetVL(question: any): Promise<number> {
    return this.commandLetVLwithEntry(await question(OrchestratorPredict.questionForUtteranceLabelsFromLowConfidence));
  }

  public commandLetVLwithEntry(entry: string): number {
    if (!this.currentEvaluationOutput) {
      console.log('ERROR: There is no validation report, please use the "v" command to create one');
      return -1;
    }
    const labelUtterancesTotal: number =
    this.currentEvaluationOutput.evaluationReportLabelUtteranceStatistics.labelStatisticsAndHtmlTable.labelUtterancesTotal;
    if (labelUtterancesTotal <= 0) {
      console.log('ERROR: There is no examples or there is no validation report, please use the "v" command to create one');
      return -2;
    }
    const scoringLowConfidenceUtterancesSimpleArrays: string[][] =
    this.currentEvaluationOutput.evaluationReportAnalyses.lowConfidenceAnalysis.scoringLowConfidenceUtterancesSimpleArrays;
    let indexInput: string = entry;
    indexInput = indexInput.trim();
    if (Utility.isEmptyString(indexInput)) {
      console.log('ERROR: Please enter an integer index to access the validation LowConfidence entry');
      return -3;
    }
    if (Number.isInteger(Number(indexInput))) {
      const index: number = Number(indexInput);
      // eslint-disable-next-line max-depth
      if ((index < 0) || (index >= scoringLowConfidenceUtterancesSimpleArrays.length)) {
        const errorMessage: string =
          ` The index "${index}" you entered is not in range, the array length is: ${scoringLowConfidenceUtterancesSimpleArrays.length}`;
        console.log(`ERROR: ${errorMessage}`);
        return -4;
      }
      this.currentUtterance = scoringLowConfidenceUtterancesSimpleArrays[index][0];
      this.currentIntentLabels = scoringLowConfidenceUtterancesSimpleArrays[index][1].split(',');
    } else {
      console.log('ERROR: Please enter an integer index to access the validation LowConfidence entry');
      return -5;
    }
    return 0;
  }

  public async commandLetVAT(question: any): Promise<number> {
    return this.commandLetVATwithEntry(await question(OrchestratorPredict.questionForAmbiguousThreshold));
  }

  public commandLetVATwithEntry(entry: string): number {
    const ambiguousClosenessParameter: string = entry;
    const ambiguousCloseness: number = Number(ambiguousClosenessParameter);
    if (Number.isNaN(ambiguousCloseness)) {
      Utility.debuggingLog(`The input "${ambiguousClosenessParameter}" is not a number.`);
      return -1;
    }
    this.ambiguousCloseness = ambiguousCloseness;
    return 0;
  }

  public async commandLetVLT(question: any): Promise<number> {
    return this.commandLetVLTwithEntry(await question(OrchestratorPredict.questionForLowConfidenceThreshold));
  }

  public commandLetVLTwithEntry(entry: string): number {
    const lowConfidenceScoreThresholdParameter: string = entry;
    const lowConfidenceScoreThreshold: number = Number(lowConfidenceScoreThresholdParameter);
    if (Number.isNaN(lowConfidenceScoreThreshold)) {
      Utility.debuggingLog(`The input "${lowConfidenceScoreThresholdParameter}" is not a number.`);
      return -1;
    }
    this.lowConfidenceScoreThreshold = lowConfidenceScoreThreshold;
    return 0;
  }

  public async commandLetVMT(question: any): Promise<number> {
    return this.commandLetVMTwithEntry(await question(OrchestratorPredict.questionForMultiLabelPredictionThreshold));
  }

  public commandLetVMTwithEntry(entry: string): number {
    const multiLabelPredictionThresholdParameter: string = entry;
    const multiLabelPredictionThreshold: number = Number(multiLabelPredictionThresholdParameter);
    if (Number.isNaN(multiLabelPredictionThreshold)) {
      Utility.debuggingLog(`The input "${multiLabelPredictionThresholdParameter}" is not a number.`);
      return -1;
    }
    this.multiLabelPredictionThreshold = multiLabelPredictionThreshold;
    return 0;
  }

  public async commandLetVUT(question: any): Promise<number> {
    return this.commandLetVUTwithEntry(await question(OrchestratorPredict.questionForunknownLabelPredictionThreshold));
  }

  public commandLetVUTwithEntry(entry: string): number {
    const unknownLabelPredictionThresholdParameter: string = entry;
    const unknownLabelPredictionThreshold: number = Number(unknownLabelPredictionThresholdParameter);
    if (Number.isNaN(unknownLabelPredictionThreshold)) {
      Utility.debuggingLog(`The input "${unknownLabelPredictionThresholdParameter}" is not a number.`);
      return -1;
    }
    this.unknownLabelPredictionThreshold = unknownLabelPredictionThreshold;
    return 0;
  }

  public commandLetA(): number {
    const example: Example = Example.newIntentExample(
      this.currentUtterance,
      this.currentIntentLabels);
    const exampleObejct: any = example.toObject();
    Utility.debuggingLog(`exampleObejct=${Utility.jsonStringify(exampleObejct)}`);
    const rvAddExample: any = this.labelResolver.addExample(exampleObejct);
    Utility.debuggingLog(`rv=${rvAddExample}`);
    if (!rvAddExample) {
      console.log(`ERROR: There is an error, the example was not added, example: ${Utility.jsonStringify(exampleObejct)}`);
      return -1;
    }
    console.log(`> Utterance '${this.currentUtterance}' has been added to '${Utility.jsonStringify(this.currentIntentLabels)}'`);
    return 0;
  }

  public commandLetR(): number {
    const example: Example = Example.newIntentExample(
      this.currentUtterance,
      this.currentIntentLabels);
    const exampleObejct: any = example.toObject();
    Utility.debuggingLog(`exampleObejct=${Utility.jsonStringify(exampleObejct)}`);
    const rvRemoveExample: any = this.labelResolver.removeExample(exampleObejct);
    Utility.debuggingLog(`rv=${rvRemoveExample}`);
    if (!rvRemoveExample) {
      console.log(`ERROR: There is an error, the example was not removed, example: ${Utility.jsonStringify(exampleObejct)}`);
      return -1;
    }
    console.log(`> Utterance '${this.currentUtterance}' has been removed from '${Utility.jsonStringify(this.currentIntentLabels)}'`);
    return 0;
  }

  public commandLetC(): number {
    const exampleToRemove: Example = Example.newIntentExample(
      this.currentUtterance,
      this.currentIntentLabels);
    const exampleObejctToRemove: any = exampleToRemove.toObject();
    Utility.debuggingLog(`exampleObejctToRemove=${Utility.jsonStringify(exampleObejctToRemove)}`);
    const rvRemoveExample: any = this.labelResolver.removeExample(exampleObejctToRemove);
    Utility.debuggingLog(`rvRemoveExample=${rvRemoveExample}`);
    if (!rvRemoveExample) {
      console.log(`ERROR: There is an error, the example was not removed, example: ${Utility.jsonStringify(exampleObejctToRemove)}`);
      return -1;
    }
    const exampleToAdd: Example = Example.newIntentExample(
      this.currentUtterance,
      this.newIntentLabels);
    const exampleObejctToAdd: any = exampleToAdd.toObject();
    Utility.debuggingLog(`exampleObejctToAdd=${Utility.jsonStringify(exampleObejctToAdd)}`);
    const rvAddExample: any = this.labelResolver.addExample(exampleObejctToAdd);
    Utility.debuggingLog(`rvAddExample=${rvAddExample}`);
    if (!rvAddExample) {
      console.log(`ERROR: There is an error, the example was not added, example: ${Utility.jsonStringify(exampleObejctToAdd)}`);
      return -2;
    }
    console.log(`> Utterance '${this.currentUtterance}' has been moved from '${Utility.jsonStringify(this.currentIntentLabels)}' to '${Utility.jsonStringify(this.newIntentLabels)}'`);
    return 0;
  }

  public commandLetRL(): number {
    if (Utility.isEmptyStringArray(this.currentIntentLabels)) {
      console.log('ERROR: "Current" intent label array is empty.');
      return -1;
    }
    for (const label of this.currentIntentLabels) {
      const rvRemoveLabel: any = this.labelResolver.removeLabel(label);
      if (!rvRemoveLabel) {
        console.log(`ERROR: Failed to remove label: '${label}'`);
        return -1;
      }
    }
    console.log(`> Labels '${this.currentIntentLabels}' have been removed from the model.`);
    return 0;
  }

  public commandLetN(): number {
    const snapshot: any = this.labelResolver.createSnapshot();
    OrchestratorHelper.writeToFile(this.getPredictingSetSnapshotFilename(), snapshot);
    Utility.debuggingLog(`Snapshot written to ${this.getPredictingSetSnapshotFilename()}`);
    console.log(`> A new snapshot has been saved to '${this.getPredictingSetSnapshotFilename()}'`);
    return 0;
  }
}