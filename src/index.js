import process from "node:process";
import axios from "axios";
import fs from "fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import debug from "debug";
import Listr from "listr";

import { urlToFilename, urlToDirname } from "./utils/index.js";

const log = debug("page-loader");

const sourceAttrs = {
	link: 'href',
    script: 'src',
    img: 'src',
};

const pageLoader = (pageUrl, outputDir = "") => {
	log("url", pageUrl);
	log("output directory", outputDir);
	const url = new URL(pageUrl);
	const slug = `${url.hostname}${url.pathname}`;
	const mainFile = urlToFilename(slug);
	const pathToProjectDir = path.resolve(process.cwd(), outputDir);
	const pathToMainFile = path.join(pathToProjectDir, mainFile);
	const assetsDirname = urlToDirname(slug);
	const assetsDirPath = path.join(pathToProjectDir, assetsDirname);

	const prepareAsset = (tag, attrName) => {
		const { hostname, pathname, protocol } = new URL(tag.attr(attrName), url.origin)
		const assetUrl = `${hostname}${pathname}`
		const assetName = urlToFilename(assetUrl);
		const fixAssetUrlToHtml = path.join(assetsDirname, assetName);
		const pathToAsset = path.join(pathToProjectDir, fixAssetUrlToHtml);

		return axios
			.get(`${protocol}${assetUrl}`, { responseType: "arraybuffer" })
			.then(({ data }) => {
				log(`Try to write asset - ${assetName}`);

				return fs
					.writeFile(pathToAsset, data, {})
					.then(() => {
						cheerioData(tag).attr(attrName, fixAssetUrlToHtml);
					})
					.catch((e) => {
						console.error(`Cannot write file - ${pathToAsset}`);
						console.error(e.message);
						log(`Cannot write file - ${pathToAsset}`);
					});
			})
			.catch(() => {
				console.error(`Error when downloading resource - ${pathToAsset}`);
				console.error("File will be empty");
				cheerioData(tag).attr(attrName, fixAssetUrlToHtml);
				return fs.writeFile(pathToAsset, "");
			});
	};

	let siteData;
	let cheerioData;

	return axios
		.get(pageUrl)
		.then(({ data }) => {
			siteData = data;
			return fs
				.access(pathToProjectDir)
				.then(() => fs.rm(pathToProjectDir, { recursive: true }))
				.then(() => fs.mkdir(pathToProjectDir))
				.catch(() => {
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
						const taskName = new URL(tag.attr(attrName), url.origin).toString();
						assetsPromises.push({ title: taskName, task: () => prepareAsset(tag, attrName) });
					});
			});
			const listr = new Listr(assetsPromises, { concurrent: true });
			return listr.run();
		})
		.then(() => {
			log("Try to write main file");
			return fs.writeFile(pathToMainFile, cheerioData.html());
		})
};

export default pageLoader;