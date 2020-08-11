/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import {LabelType} from './labeltype';
import {Label} from './label';
import {Span} from './span';
import {Utility} from './utility';
import {PrebuiltToRecognizerMap} from './resources/recognizer-map';

const ReadText: any = require('read-text-file');
const LuisBuilder: any = require('@microsoft/bf-lu').V2.LuisBuilder;
const QnaMakerBuilder: any = require('@microsoft/bf-lu').V2.QnAMakerBuilder;
const processedFiles: string[] = [];

export class OrchestratorHelper {
  public static exists(path: string): boolean {
    return fs.existsSync(path);
  }

  public static isDirectory(path: string): boolean {
    try {
      const stats: fs.Stats = fs.statSync(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  public static readBluSnapshotFile(filePath: string): string {
    return Utility.processUnknowLabelsInBluFileContent(ReadText.readSync(filePath));
  }

  public static readFile(filePath: string): string {
    return ReadText.readSync(filePath);
  }

  public static writeToFile(filePath: string, content: string, options: any = {encoding: 'utf8', flag: 'w'}): string {
    fs.writeFileSync(filePath, content, options);
    Utility.writeToConsole(`Successfully wrote to file ${filePath}`);
    return filePath;
  }

  public static deleteFile(filePath: string)  {
    fs.unlinkSync(filePath);
  }

  public static createDteContent(utteranceLabelsMap: { [id: string]: string[] }) {
    const labelUtteranceMap: { [label: string]: string} = {};
    // eslint-disable-next-line guard-for-in
    for (const utterance in utteranceLabelsMap) {
      const labels: string[] = utteranceLabelsMap[utterance];
      labels.forEach((label: string) => {
        if (label in labelUtteranceMap) {
          labelUtteranceMap[label] = labelUtteranceMap[label] + '|' + utterance;
        } else {
          labelUtteranceMap[label] = utterance;
        }
      });
    }
    let key: number = 0;
    let tsvContent: string = '';
    // eslint-disable-next-line guard-for-in
    for (const label in labelUtteranceMap) {
      const utterances: string = labelUtteranceMap[label];
      const line: string = key + '\t' + label + '\t' + utterances + '\n';
      tsvContent += line;
      key += 1;
    }

    return tsvContent;
  }

  public static async getTsvContent(
    filePath: string,
    hierarchical: boolean = false,
    outputDteFormat: boolean = false)  {
    const utteranceLabelsMap: { [id: string]: string[] } = (await OrchestratorHelper.getUtteranceLabelsMap(filePath, hierarchical)).utteranceLabelsMap;
    let tsvContent: string = '';

    if (outputDteFormat) {
      tsvContent = OrchestratorHelper.createDteContent(utteranceLabelsMap);
    } else {
      // eslint-disable-next-line guard-for-in
      for (const utterance in utteranceLabelsMap) {
        const labels: any = utteranceLabelsMap[utterance];
        const line: string = labels.join() + '\t' + utterance + '\n';
        tsvContent += line;
      }
    }

    return tsvContent;
  }

  public static getSnapshotFromFile(file: string) {
    return new TextEncoder().encode(OrchestratorHelper.readBluSnapshotFile(file));
  }

  public static async getUtteranceLabelsMap(
    filePath: string,
    hierarchical: boolean = false): Promise<{
      'utteranceLabelsMap': { [id: string]: string[] };
      'utteranceLabelDuplicateMap': Map<string, Set<string>>; }> {
    const utteranceLabelsMap: { [id: string]: string[] } = {};
    const utteranceLabelDuplicateMap: Map<string, Set<string>> = new Map<string, Set<string>>();

    if (OrchestratorHelper.isDirectory(filePath)) {
      await OrchestratorHelper.iterateInputFolder(filePath, utteranceLabelsMap, utteranceLabelDuplicateMap, hierarchical);
    } else {
      await OrchestratorHelper.processFile(filePath, path.basename(filePath), utteranceLabelsMap, utteranceLabelDuplicateMap, hierarchical);
    }

    return Utility.processUnknowLabelsInUtteranceLabelsMap({utteranceLabelsMap, utteranceLabelDuplicateMap});
  }

  public static writeDialogFiles(out: string, isDialog: boolean, baseName: string, recognizers: any = []) {
    if (!isDialog) return undefined;
    const recoContent: {
      '$kind': string;
      'modelPath': string;
      'snapshotPath': string;
      'entityRecognizers': any;
    } = {
      $kind: 'Microsoft.OrchestratorRecognizer',
      modelPath: '=settings.orchestrator.modelPath',
      snapshotPath: `=settings.orchestrator.snapshots.${baseName}`,
      entityRecognizers: recognizers,
    };

    const recoFileName: string = path.join(out, `${baseName}.lu.dialog`);
    this.writeToFile(recoFileName, JSON.stringify(recoContent, null, 2));
    const multiRecoContent: any = {
      $kind: 'Microsoft.MultiLanguageRecognizer',
      recognizers: {
        'en-us': `${baseName}.en-us.lu`,
        '': `${baseName}.en-us.lu`,
      },
    };

    const multiRecoFileName: string = path.join(out, `${baseName}.en-us.lu.dialog`);
    this.writeToFile(multiRecoFileName, JSON.stringify(multiRecoContent, null, 2));
    return baseName;
  }

  public static writeSettingsFile(nlrpath: string, settings: any, out: string) {
    const content: {
      'orchestrator': {
        'modelPath': string;
        'snapshots': string;
      };
    } = {
      orchestrator: {
        modelPath: nlrpath,
        snapshots: settings,
      },
    };

    const contentFileName: string = path.join(out, 'orchestrator.settings.json');

    this.writeToFile(contentFileName, JSON.stringify(content, null, 2));
  }

  public static async getEntitiesInLu(input: string): Promise<any> {
    const fileContents: string = OrchestratorHelper.readFile(input);
    const luObject: any = {
      content: fileContents,
      id: input,
    };
    const luisObject: any = await LuisBuilder.fromLUAsync([luObject], OrchestratorHelper.findLuFiles);
    return this.transformEntities(luisObject);
  }

  public static transformEntities(luisObject: any): string[] {
    if (luisObject.prebuiltEntities === undefined || !Array.isArray(luisObject.prebuiltEntities) || luisObject.prebuiltEntities.length === 0) return [];
    const entitiesList: any = [];
    (luisObject.prebuiltEntities || []).forEach((item: any) => {
      const mapValue: any = PrebuiltToRecognizerMap[item.name.toLowerCase().trim()];
      if (mapValue !== undefined && mapValue !== '') {
        entitiesList.push({
          $kind: mapValue,
        });
      } else {
        process.stdout.write(`\n[WARN:] No entity recognizer available for Prebuilt entity '${item.name}'\n`);
      }
    });
    return entitiesList;
  }

  // eslint-disable-next-line max-params
  static async processFile(
    filePath: string,
    fileName: string,
    utteranceLabelsMap: { [id: string]: string[] },
    utteranceLabelDuplicateMap: Map<string, Set<string>>,
    hierarchical: boolean) {
    const ext: string = path.extname(filePath);
    if (ext === '.lu') {
      Utility.writeToConsole(`Processing ${filePath}...`);
      await OrchestratorHelper.parseLuFile(
        filePath,
        OrchestratorHelper.getLabelFromFileName(fileName, ext, hierarchical),
        utteranceLabelsMap,
        utteranceLabelDuplicateMap);
    } else if (ext === '.qna') {
      Utility.writeToConsole(`Processing ${filePath}...`);
      await OrchestratorHelper.parseQnaFile(
        filePath,
        OrchestratorHelper.getLabelFromFileName(fileName, ext, hierarchical),
        utteranceLabelsMap,
        utteranceLabelDuplicateMap);
    } else if (ext === '.json') {
      Utility.writeToConsole(`Processing ${filePath}...\n`);
      OrchestratorHelper.getLuisIntentsUtterances(
        fs.readJsonSync(filePath),
        OrchestratorHelper.getLabelFromFileName(fileName, ext, hierarchical),
        utteranceLabelsMap,
        utteranceLabelDuplicateMap);
    } else if (ext === '.tsv' || ext === '.txt') {
      Utility.writeToConsole(`Processing ${filePath}...\n`);
      OrchestratorHelper.parseTsvFile(
        filePath,
        OrchestratorHelper.getLabelFromFileName(fileName, ext, hierarchical),
        utteranceLabelsMap,
        utteranceLabelDuplicateMap);
    } else if (ext === '.blu') {
      Utility.writeToConsole(`Processing ${filePath}...\n`);
      OrchestratorHelper.parseBluFile(
        filePath,
        utteranceLabelsMap,
        utteranceLabelDuplicateMap);
    } else {
      throw new Error(`${filePath} has invalid extension - lu, qna, json and tsv files are supported.`);
    }
  }

  static async parseBluFile(
    bluFile: string,
    utteranceLabelsMap: { [id: string]: string[] },
    utteranceLabelDuplicateMap: Map<string, Set<string>>) {
    const lines: string[] = OrchestratorHelper.readFile(bluFile).split('\n');
    if (lines.length === 0 || lines.length === 1) {
      return;
    }
    lines.shift();
    OrchestratorHelper.tryParseLabelUtteranceTsv(lines, utteranceLabelsMap, utteranceLabelDuplicateMap, true);
  }

  static async parseLuFile(
    luFile: string,
    hierarchicalLabel: string,
    utteranceLabelsMap: { [id: string]: string[] },
    utteranceLabelDuplicateMap: Map<string, Set<string>>) {
    const fileContents: string = OrchestratorHelper.readFile(luFile);
    const luObject: any = {
      content: fileContents,
      id: luFile,
    };
    const luisObject: any = await LuisBuilder.fromLUAsync([luObject], OrchestratorHelper.findLuFiles);
    OrchestratorHelper.getLuisIntentsUtterances(luisObject, hierarchicalLabel, utteranceLabelsMap, utteranceLabelDuplicateMap);
  }

  static async parseTsvFile(
    tsvFile: string,
    hierarchicalLabel: string,
    utteranceLabelsMap: { [id: string]: string[] },
    utteranceLabelDuplicateMap: Map<string, Set<string>>) {
    const lines: string[] = OrchestratorHelper.readFile(tsvFile).split('\n');
    Utility.debuggingLog(`OrchestratorHelper.parseTsvFile(), lines=${lines.length}`);
    if (lines.length === 0) {
      return;
    }
    if (!OrchestratorHelper.tryParseQnATsvFile(lines, hierarchicalLabel, utteranceLabelsMap, utteranceLabelDuplicateMap)) {
      OrchestratorHelper.tryParseLabelUtteranceTsv(lines, utteranceLabelsMap, utteranceLabelDuplicateMap);
    }
  }

  static tryParseLabelUtteranceTsv(
    lines: string[],
    utteranceLabelsMap: { [id: string]: string[] },
    utteranceLabelDuplicateMap: Map<string, Set<string>>,
    bluFormat: boolean = false): boolean {
    if (!bluFormat && OrchestratorHelper.hasLabelUtteranceHeader(lines[0])) {
      lines.shift();
    }
    lines.forEach((line: string) => {
      const items: string[] = line.split('\t');
      if (items.length < 2) {
        return;
      }
      let labels: string = items[0] ? items[0] : '';
      const utteranceIdx: number = (items.length === 3 && !bluFormat) ? 2 : 1;
      let utterance: string = items[utteranceIdx] ? items[utteranceIdx] : '';
      labels = labels.trim();
      utterance = utterance.trim();
      const labelArray: string[] = labels.split(',');
      for (const label of labelArray) {
        OrchestratorHelper.addNewLabelUtterance(
          utterance,
          label.trim(),
          '',
          utteranceLabelsMap,
          utteranceLabelDuplicateMap
        );
      }
    });
    return true;
  }

  static tryParseQnATsvFile(
    lines: string[],
    label: string,
    utteranceLabelsMap: { [id: string]: string[] },
    utteranceLabelDuplicateMap: Map<string, Set<string>>): boolean {
    if (!OrchestratorHelper.isQnATsvHeader(lines[0])) {
      return false;
    }
    lines.shift();
    lines.forEach((line: string) => {
      const items: string[] = line.split('\t');
      if (items.length < 2) {
        return;
      }
      OrchestratorHelper.addNewLabelUtterance(
        items[0].trim(),
        label,
        '',
        utteranceLabelsMap,
        utteranceLabelDuplicateMap
      );
    });

    return true;
  }

  static isQnATsvHeader(header: string): boolean {
    return header.indexOf('Question') >= 0 && header.indexOf('Answer') > 0;
  }

  static hasLabelUtteranceHeader(header: string): boolean {
    return header.indexOf('Label') >= 0 &&
      (header.indexOf('Text') > 0 || header.indexOf('Utterance') > 0);
  }

  static async parseQnaFile(
    qnaFile: string,
    label: string,
    utteranceLabelsMap: { [id: string]: string[] },
    utteranceLabelDuplicateMap: Map<string, Set<string>>) {
    const fileContents: string = OrchestratorHelper.readFile(qnaFile);
    const lines: string[] = fileContents.split('\n');
    if (lines.length === 0) {
      return;
    }

    const newlines: string[] = [];
    lines.forEach((line: string) => {
      if (line.indexOf('> !# @qna.pair.source =') < 0) {
        newlines.push(line);
      }
    });

    const qnaObject: any = await QnaMakerBuilder.fromContent(newlines.join('\n'));
    if (qnaObject) {
      OrchestratorHelper.getQnaQuestionsAsUtterances(qnaObject, label, utteranceLabelsMap, utteranceLabelDuplicateMap);
    } else {
      throw new Error(`Failed parsing qna file ${qnaFile}`);
    }
  }

  static async iterateInputFolder(
    folderPath: string,
    utteranceLabelsMap: { [id: string]: string[] },
    utteranceLabelDuplicateMap: Map<string, Set<string>>,
    hierarchical: boolean) {
    const supportedFileFormats: string[] = ['.lu', '.json', '.qna', '.tsv', '.txt'];
    const items: string[] = fs.readdirSync(folderPath);
    for (const item of items) {
      const currentItemPath: string = path.join(folderPath, item);
      const isDirectory: boolean = fs.lstatSync(currentItemPath).isDirectory();

      if (isDirectory) {
        // eslint-disable-next-line no-await-in-loop
        await OrchestratorHelper.iterateInputFolder(currentItemPath, utteranceLabelsMap, utteranceLabelDuplicateMap, hierarchical);
      } else {
        const ext: string = path.extname(item);
        if (processedFiles.includes(currentItemPath)) {
          continue;
        }
        if (supportedFileFormats.indexOf(ext) > -1) {
          // eslint-disable-next-line no-await-in-loop
          await OrchestratorHelper.processFile(currentItemPath, item, utteranceLabelsMap, utteranceLabelDuplicateMap, hierarchical);
        }
      }
    }
  }

  static getLuisIntentsUtterances(
    luisObject: any,
    hierarchicalLabel: string,
    utteranceLabelsMap: { [id: string]: string[] },
    utteranceLabelDuplicateMap: Map<string, Set<string>>) {
    // eslint-disable-next-line no-prototype-builtins
    if (luisObject.hasOwnProperty('utterances')) {
      luisObject.utterances.forEach((e: any) => {
        const label: string = e.intent.trim();
        const utterance: string = e.text.trim();
        OrchestratorHelper.addNewLabelUtterance(
          utterance,
          label,
          hierarchicalLabel,
          utteranceLabelsMap,
          utteranceLabelDuplicateMap
        );
      });
    }
  }

  static getQnaQuestionsAsUtterances(
    qnaObject: any,
    label: string,
    utteranceLabelsMap: { [id: string]: string[] },
    utteranceLabelDuplicateMap: Map<string, Set<string>>) {
    qnaObject.kb.qnaList.forEach((e: any) => {
      const questions: string[] = e.questions;
      questions.forEach((q: string) => {
        OrchestratorHelper.addNewLabelUtterance(
          q.trim(),
          label,
          '',
          utteranceLabelsMap,
          utteranceLabelDuplicateMap
        );
      });
    });
  }

  // eslint-disable-next-line max-params
  static getJsonIntentsEntitiesUtterances(
    jsonObjectArray: any,
    utteranceLabelsMap: { [id: string]: string[] },
    utteranceLabelDuplicateMap: Map<string, Set<string>>,
    utteranceEntityLabelsMap: { [id: string]: Label[] },
    utteranceEntityLabelDuplicateMap: Map<string, Label[]>): void {
    // eslint-disable-next-line no-prototype-builtins
    jsonObjectArray.forEach((jsonObject: any) => {
      const utterance: string = jsonObject.text.trim();
      const labels: string[] = jsonObject.intents;
      const entities: any[] = jsonObject.entities;
      labels.forEach((label: string) => {
        OrchestratorHelper.addNewLabelUtterance(
          utterance,
          label,
          '',
          utteranceLabelsMap,
          utteranceLabelDuplicateMap);
      });
      entities.forEach((entityEntry: any) => {
        OrchestratorHelper.addNewEntityLabelUtterance(
          utterance,
          entityEntry,
          utteranceEntityLabelsMap,
          utteranceEntityLabelDuplicateMap);
      });
    });
    Utility.processUnknowLabelsInUtteranceLabelsMap({utteranceLabelsMap, utteranceLabelDuplicateMap});
  }

  static getLabelFromFileName(fileName: string, ext: string, hierarchical: boolean) {
    return hierarchical ? fileName.substr(0, fileName.length - ext.length) : '';
  }

  // eslint-disable-next-line max-params
  static addNewLabelUtterance(
    utterance: string,
    label: string,
    hierarchicalLabel: string,
    utteranceLabelsMap: { [id: string]: string[] },
    utteranceLabelDuplicateMap: Map<string, Set<string>>): void {
    const existingLabels: string[] = utteranceLabelsMap[utterance];
    if (existingLabels) {
      if (hierarchicalLabel && hierarchicalLabel.length > 0) {
        if (!OrchestratorHelper.addUniqueLabel(hierarchicalLabel, existingLabels)) {
          Utility.insertStringPairToStringIdStringSetNativeMap(utterance, hierarchicalLabel, utteranceLabelDuplicateMap);
        }
      } else if (!OrchestratorHelper.addUniqueLabel(label, existingLabels)) {
        Utility.insertStringPairToStringIdStringSetNativeMap(utterance, label, utteranceLabelDuplicateMap);
      }
    } else if (hierarchicalLabel && hierarchicalLabel.length > 0) {
      utteranceLabelsMap[utterance] = [hierarchicalLabel];
    } else {
      utteranceLabelsMap[utterance] = [label];
    }
  }

  // eslint-disable-next-line max-params
  static addNewEntityLabelUtterance(
    utterance: string,
    entityEntry: any,
    utteranceEntityLabelsMap: { [id: string]: Label[] },
    utteranceEntityLabelDuplicateMap: Map<string, Label[]>): void {
    let existingEntityLabels: Label[] = utteranceEntityLabelsMap[utterance];
    const entity: string = entityEntry.entity;
    const startPos: number = Number(entityEntry.startPos);
    const endPos: number = Number(entityEntry.endPos);
    // const entityMention: string = entityEntry.text;
    const entityLabel: Label = new Label(LabelType.Entity, entity, new Span(startPos, endPos - startPos + 1));
    if (existingEntityLabels) {
      if (!OrchestratorHelper.addUniqueEntityLabel(entityLabel, existingEntityLabels)) {
        Utility.insertStringLabelPairToStringIdLabelSetNativeMap(utterance, entityLabel, utteranceEntityLabelDuplicateMap);
      }
    } else {
      existingEntityLabels = [entityLabel];
      utteranceEntityLabelsMap[utterance] = existingEntityLabels;
    }
  }

  static addUniqueLabel(newLabel: string, labels: string[]): boolean {
    for (const label of labels) {
      if (label === newLabel) {
        return false;
      }
    }
    labels.push(newLabel);
    return true;
  }

  static addUniqueEntityLabel(newLabel: Label, labels: Label[]): boolean {
    for (const label of labels) {
      if (label.equals(newLabel)) {
        return false;
      }
    }
    labels.push(newLabel);
    return true;
  }

  static findLuFiles(srcId: string, idsToFind: string[]) {
    const baseDir: string = path.dirname(srcId);
    const retPayload: any[] = [];
    (idsToFind || []).forEach((ask: any)  => {
      const resourceToFind: string = path.isAbsolute(ask.filePath) ? ask.filePath : path.join(baseDir, ask.filePath);
      const fileContent: string = OrchestratorHelper.readFile(resourceToFind);
      if (!processedFiles.includes(resourceToFind)) {
        processedFiles.push(resourceToFind);
      }
      if (fileContent) {
        retPayload.push({
          content: fileContent,
          options: {
            id: ask.filePath,
          },
        });
      } else {
        throw new Error(`Content not found for ${resourceToFind}.`);
      }
    });
    return retPayload;
  }
}
