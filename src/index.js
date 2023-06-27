import process from "node:process";
import axios from "axios";
import fs from "fs/promises";
import path from "node:path";
import { formattedFilename } from "./utils/formattedFilename.js";

export const pageLoader = (url, outputDir = process.cwd()) => {
	const absoluteOutputDirPath = path.resolve(process.cwd(), outputDir);
	const sourceFilename = formattedFilename(url);

	return axios(url).then(({ data }) => {
		return fs
			.access(absoluteOutputDirPath)
			.then(() => {
				return fs.writeFile(path.join(absoluteOutputDirPath, sourceFilename), data, "utf-8").then(() => {
					console.log(`successs`, sourceFilename);
				});
			})
			.catch(() => {
				return fs.mkdir(absoluteOutputDirPath).then(() => {
					return fs.writeFile(path.join(absoluteOutputDirPath, sourceFilename), data, "utf-8").then(() => {
						console.log(`successs`, sourceFilename);
					});
				});
			});
	});
};
