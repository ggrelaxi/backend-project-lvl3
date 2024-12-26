#!/usr/bin/env node
import { Command } from 'commander';
import process from 'node:process';
import pageLoader from '../src/index.js';

const programm = new Command();

programm.description('CLI web page downloader').version('0.0.1');

programm
  .description('Download the web page in the specified path')
  .option('-o, --output [dir]', 'directory for saving files')
  .argument('<url>')
  .action((url, options) => {
    pageLoader(url, options.output)
      .then((filepath) => {
        console.log(`Page was successfully downloaded, into - ${filepath}`);
      })
      .catch((e) => {
        console.error(e.message);
        process.exit(1);
      });
  });
programm.parse(process.argv);
