import process from "node:process";
import axios from "axios";
import fs from "fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import debug from "debug";

import { urlToFilename, urlToDirname, processName } from "./utils/index.js";

const log = debug("page-loader");

const sourceAttrs = {
	link: "href",
	script: "link",
	img: "src",
};

export const pageLoader = (pageUrl, outputDir = "") => {
	log("url", pageUrl);
	log("output directory", outputDir);

	const url = new URL(pageUrl);
	const slug = `${url.hostname}${url.pathname}`;
	const mainFile = urlToFilename(slug);
	const pathToProjectDir = path.resolve(process.cwd(), outputDir);
	const pathToMainFile = path.join(pathToProjectDir, mainFile);
	const assetsDirname = urlToDirname(slug);
	const assetsDirPath = path.join(pathToProjectDir, assetsDirname);

	let siteData;
	let cheerioData;

	return axios
		.get(pageUrl)
		.then(({ data }) => {
			siteData = data;

			return fs.access(pathToProjectDir).catch(() => {
				log(`create project directory - ${pathToProjectDir}`);

				return fs.mkdir(pathToProjectDir);
			});
		})
		.then(() => {
			return fs.access(assetsDirPath).catch(() => {
				log(`create assets directory - ${assetsDirPath}`);

				return fs.mkdir(assetsDirPath);
			});
		})
		.then(() => {
			cheerioData = cheerio.load(siteData);
			const assetsPromises = [];

			Object.entries(sourceAttrs).forEach(([tagName, attrName]) => {
				const tags = cheerioData(tagName).toArray();
				tags
					.map((tag) => cheerioData(tag))
					.filter((tag) => tag.attr(attrName) !== undefined)
					.filter((tag) => {
						const linkAttr = tag.attr(attrName);
						const tagUrl = new URL(linkAttr, url.origin);
						return tagUrl.origin === url.origin;
					})
					.forEach((tag) => {
						const assetUrl = new URL(tag.attr(attrName), url.origin).toString();

						const promise = axios
							.get(assetUrl, { responseType: "arraybuffer" })
							.then(({ data }) => {
								const assetName = urlToFilename(tag.attr(attrName));

								const fixAssetUrlToHtml = path.join(assetsDirname, [processName(url.hostname), assetName].join("-"));
								const pathToAsset = path.join(pathToProjectDir, fixAssetUrlToHtml);

								log(`Try to write asset - ${assetName}`);

								return fs
									.writeFile(pathToAsset, data)
									.then(() => {
										cheerioData(tag).attr(attrName, fixAssetUrlToHtml);
									})
									.catch((e) => {
										console.log(e);
									});
							})
							.catch((e) => {
								return;
							});

						assetsPromises.push(promise);
					});
			});

			return Promise.all(assetsPromises);
		})
		.then(() => {
			log("Try to write main file");
			return fs.writeFile(pathToMainFile, cheerioData.html());
		});
};
