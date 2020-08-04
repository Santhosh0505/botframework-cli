/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import assert = require('assert');

import {} from 'mocha';

import {Utility} from '../src/utility';

export class UnitTestHelper {
  public static getDefaultUnitTestTimeout(): number {
    return 80000;
  }

  public static getDefaultUnitTestDebuggingLogFlag(): boolean {
    return false;
  }

  public static getDefaultUnitTestCleanUpFlag(): boolean {
    return true;
  }
}

describe('Test Suite - utility', () => {
  it('Test.0200 Utility.buildStringIdNumberValueDictionaryFromStringArray()', function () {
    Utility.toPrintDebuggingLogToConsole = UnitTestHelper.getDefaultUnitTestDebuggingLogFlag();
    this.timeout(UnitTestHelper.getDefaultUnitTestTimeout());
    const labels: string[] = ['A', 'B', 'C'];
    const labelArrayAndMap: {
      'stringArray': string[];
      'stringMap': {[id: string]: number};} =
      Utility.buildStringIdNumberValueDictionaryFromStringArray(labels);
    Utility.debuggingLog(`labelArrayAndMap.stringArray=${labelArrayAndMap.stringArray}`);
    Utility.debuggingLog(`labelArrayAndMap.stringMap=${labelArrayAndMap.stringMap}`);
    assert.ok(labelArrayAndMap.stringArray.length === 3);
    if (!(Utility.UnknownLabel in labelArrayAndMap.stringMap)) {
      labelArrayAndMap.stringArray.push(Utility.UnknownLabel);
      labelArrayAndMap.stringMap[Utility.UnknownLabel] = labelArrayAndMap.stringArray.length - 1;
      // ---- NOTE ---- Somehow the code below cannot compile, as the compiler or linter
      // ---- NOTE ---- thought that it's a contradiction against the '=== 3' assert.
      // ---- NOTE ---- assert.ok(labelArrayAndMap.stringArray.length === 4);
    }
  });

  it('Test.0100 Utility.processUnknowLabelsInUtteranceLabelsMap()', function () {
    Utility.toPrintDebuggingLogToConsole = UnitTestHelper.getDefaultUnitTestDebuggingLogFlag();
    this.timeout(UnitTestHelper.getDefaultUnitTestTimeout());
    const utteranceLabelsMap: { [id: string]: string[] } = {};
    const utteranceLabelDuplicateMap: Map<string, Set<string>> = new Map<string, Set<string>>();
    const utterance0: string = 'hi';
    const labelArray0: string[] = ['greeting', 'chitchat'];
    const labelSet0: Set<string> = new Set<string>(labelArray0);
    utteranceLabelsMap[utterance0] = labelArray0;
    utteranceLabelDuplicateMap.set(utterance0, labelSet0);
    const utterance1: string = 'A';
    const labelArray1: string[] = ['greeting', '', 'unknown', 'none'];
    const labelSet1: Set<string> = new Set<string>(labelArray1);
    utteranceLabelsMap[utterance1] = labelArray1;
    utteranceLabelDuplicateMap.set(utterance1, labelSet1);
    const utterance2: string = 'B';
    const labelArray2: string[] = ['', 'unknown', 'none'];
    const labelSet2: Set<string> = new Set<string>(labelArray2);
    utteranceLabelsMap[utterance2] = labelArray2;
    utteranceLabelDuplicateMap.set(utterance2, labelSet2);
    const utterance3: string = 'C';
    const labelArray3: string[] = [];
    const labelSet3: Set<string> = new Set<string>(labelArray3);
    utteranceLabelsMap[utterance3] = labelArray3;
    utteranceLabelDuplicateMap.set(utterance3, labelSet3);
    const utteranceLabels: {
      'utteranceLabelsMap': { [id: string]: string[] };
      'utteranceLabelDuplicateMap': Map<string, Set<string>>; } = {
        utteranceLabelsMap,
        utteranceLabelDuplicateMap};
    Utility.debuggingLog(
      `utteranceLabelsMap-B=${Utility.jsonStringify(utteranceLabelsMap)}`);
    Utility.debuggingLog(
      `utteranceLabelDuplicateMap-B=${Utility.jsonStringify(utteranceLabelDuplicateMap)}`);
    Utility.processUnknowLabelsInUtteranceLabelsMap(
      utteranceLabels);
    Utility.debuggingLog(
      `utteranceLabelsMap=A=${Utility.jsonStringify(utteranceLabelsMap)}`);
    Utility.debuggingLog(
      `utteranceLabelDuplicateMap-A=${Utility.jsonStringify(utteranceLabelDuplicateMap)}`);
    assert.ok(utteranceLabelsMap.hi.length === 2);
    assert.ok(utteranceLabelsMap.A.length === 1);
    assert.ok(utteranceLabelsMap.A.indexOf('greeting') === 0);
    assert.ok(utteranceLabelsMap.B.length === 1);
    assert.ok(utteranceLabelsMap.B.indexOf(Utility.UnknownLabel) === 0);
    assert.ok(utteranceLabelsMap.C.length === 1);
    assert.ok(utteranceLabelsMap.C.indexOf(Utility.UnknownLabel) === 0);
    assert.ok((utteranceLabelDuplicateMap.get('hi') as Set<string>).size === 2);
    assert.ok((utteranceLabelDuplicateMap.get('A') as Set<string>).size === 1);
    assert.ok((utteranceLabelDuplicateMap.get('A') as Set<string>).has('greeting'));
    assert.ok((utteranceLabelDuplicateMap.get('B') as Set<string>).size === 1);
    assert.ok((utteranceLabelDuplicateMap.get('B') as Set<string>).has(Utility.UnknownLabel));
    assert.ok((utteranceLabelDuplicateMap.get('C') as Set<string>).size === 1);
    assert.ok((utteranceLabelDuplicateMap.get('C') as Set<string>).has(Utility.UnknownLabel));
  });
  it('Test.0101 Utility.processUnknowLabelsInUtteranceLabelsMapUsingLabelSet()', function () {
    Utility.toPrintDebuggingLogToConsole = UnitTestHelper.getDefaultUnitTestDebuggingLogFlag();
    this.timeout(UnitTestHelper.getDefaultUnitTestTimeout());
    const utteranceLabelsMap: { [id: string]: string[] } = {};
    const utteranceLabelDuplicateMap: Map<string, Set<string>> = new Map<string, Set<string>>();
    const utterance0: string = 'hi';
    const labelArray0: string[] = ['greeting', 'chitchat'];
    const labelSet0: Set<string> = new Set<string>(labelArray0);
    utteranceLabelsMap[utterance0] = labelArray0;
    utteranceLabelDuplicateMap.set(utterance0, labelSet0);
    const utterance1: string = 'A';
    const labelArray1: string[] = ['greeting', '', 'unknown', 'none'];
    const labelSet1: Set<string> = new Set<string>(labelArray1);
    utteranceLabelsMap[utterance1] = labelArray1;
    utteranceLabelDuplicateMap.set(utterance1, labelSet1);
    const utterance2: string = 'B';
    const labelArray2: string[] = ['', 'unknown', 'none'];
    const labelSet2: Set<string> = new Set<string>(labelArray2);
    utteranceLabelsMap[utterance2] = labelArray2;
    utteranceLabelDuplicateMap.set(utterance2, labelSet2);
    const utterance3: string = 'C';
    const labelArray3: string[] = [];
    const labelSet3: Set<string> = new Set<string>(labelArray3);
    utteranceLabelsMap[utterance3] = labelArray3;
    utteranceLabelDuplicateMap.set(utterance3, labelSet3);
    const labelSet: Set<string> = new Set<string>(['greeting']);
    const utteranceLabels: {
      'utteranceLabelsMap': { [id: string]: string[] };
      'utteranceLabelDuplicateMap': Map<string, Set<string>>; } = {
        utteranceLabelsMap,
        utteranceLabelDuplicateMap};
    Utility.debuggingLog(
      `utteranceLabelsMap-B=${Utility.jsonStringify(utteranceLabelsMap)}`);
    Utility.debuggingLog(
      `utteranceLabelDuplicateMap-B=${Utility.jsonStringify(utteranceLabelDuplicateMap)}`);
    Utility.processUnknowLabelsInUtteranceLabelsMapUsingLabelSet(
      utteranceLabels,
      labelSet);
    Utility.debuggingLog(
      `utteranceLabelsMap=A=${Utility.jsonStringify(utteranceLabelsMap)}`);
    Utility.debuggingLog(
      `utteranceLabelDuplicateMap-A=${Utility.jsonStringify(utteranceLabelDuplicateMap)}`);
    assert.ok(utteranceLabelsMap.hi.length === 1);
    assert.ok(utteranceLabelsMap.hi.indexOf('greeting') === 0);
    assert.ok(utteranceLabelsMap.A.length === 1);
    assert.ok(utteranceLabelsMap.A.indexOf('greeting') === 0);
    assert.ok(utteranceLabelsMap.B.length === 1);
    assert.ok(utteranceLabelsMap.B.indexOf(Utility.UnknownLabel) === 0);
    assert.ok(utteranceLabelsMap.C.length === 1);
    assert.ok(utteranceLabelsMap.C.indexOf(Utility.UnknownLabel) === 0);
    assert.ok((utteranceLabelDuplicateMap.get('hi') as Set<string>).size === 1);
    assert.ok((utteranceLabelDuplicateMap.get('hi') as Set<string>).has('greeting'));
    assert.ok((utteranceLabelDuplicateMap.get('A') as Set<string>).size === 1);
    assert.ok((utteranceLabelDuplicateMap.get('A') as Set<string>).has('greeting'));
    assert.ok((utteranceLabelDuplicateMap.get('B') as Set<string>).size === 1);
    assert.ok((utteranceLabelDuplicateMap.get('B') as Set<string>).has(Utility.UnknownLabel));
    assert.ok((utteranceLabelDuplicateMap.get('C') as Set<string>).size === 1);
    assert.ok((utteranceLabelDuplicateMap.get('C') as Set<string>).has(Utility.UnknownLabel));
  });

  it('Test.0000 Utility.exists()', function () {
    Utility.toPrintDebuggingLogToConsole = UnitTestHelper.getDefaultUnitTestDebuggingLogFlag();
    this.timeout(UnitTestHelper.getDefaultUnitTestTimeout());
    Utility.debuggingLog(`process.cwd()=${process.cwd()}`);
    const doesExist: boolean = Utility.exists('resources/data/Columnar/Email.txt');
    Utility.debuggingLog(`doesExist=${doesExist}`);
    assert.ok(doesExist);
  });
});

