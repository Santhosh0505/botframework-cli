/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {expect, test} from '@oclif/test';

describe('orchestrator:create', () => {
  test
  .stderr()
  .command(['orchestrator:create'])
  .it('Test.0000 orchestrator:create', (ctx: any) => {
    expect(ctx.stderr).to.contain('Invalid input');
  });

  test
  .stdout()
  .command(['orchestrator:create', '--help'])
  .it('Test.0001 orchestrator:create --help', (ctx: any) => {
    expect(ctx.stdout).to.contain('help');
  });

  test
  .stdout()
  .stderr()
  .command(['orchestrator:create', '--in', 'resources/data/Columnar/Email.txt', '--out', 'resources/data/Columnar/OrchestratorModel_Email'])
  .it('Test.0002 orchestrator:create Email.txt', (ctx: any) => {
    expect(ctx.stderr).to.contain('has invalid extension - lu, qna, json and tsv files are supported.');
  });
});
