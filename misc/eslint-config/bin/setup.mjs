#!/usr/bin/env node

import { Command, Option } from 'commander';
import { copyFile } from 'node:fs/promises';

const program = new Command();

const tsChoice = 'typescript';
const jsChoice = 'javascript';

const typeOption = new Option('--language <language>', 'install configuration').choices([tsChoice, jsChoice]).makeOptionMandatory(true);

program.name('eslint-config').description('CLI to add shared eslint/prettier configuration');

program.addOption(typeOption);

program.addHelpText(
  'after',
  `
  Example call:
  $ npx @datagrok-misc/eslint-config --language=${tsChoice}
  `,
);

const options = program.parse(process.argv).opts();

const isTypescript = options.language === tsChoice;
const extension = isTypescript ? 'ts' : 'js';

const prettierPath = new URL('../.prettierrc', import.meta.url);
const eslintPath = new URL(`../template/eslint.config.${extension}.mjs`, import.meta.url);

await copyFile(eslintPath, 'eslint.config.mjs');
await copyFile(prettierPath, '.prettierrc');
