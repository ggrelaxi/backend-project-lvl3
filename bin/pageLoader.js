#!/usr/bin/env node
import { Command } from "commander";
import { pageLoader } from "../src/index.js";

const programm = new Command();

programm.description("CLI web page downloader").version("0.0.1");

programm
	.description("Download the web page in the specified path")
	.option("-o, --output [dir]", "directory for saving files")
	.argument("<url>")
	.action(async (url, options) => {
		const response = await pageLoader(url, options.output);
	});

programm.parse(process.argv);
