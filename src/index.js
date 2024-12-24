import process from 'node:process';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import debug from 'debug';
import Listr from 'listr';

import { urlToFilename, urlToDirname } from './utils/index.js';

const log = debug('page-loader');

const sourceAttrs = {
  link: 'href',
  script: 'src',
  img: 'src',
};

const prepareAssets = (html, origin, assetsDir) => {
  const cheerioData = cheerio.load(html);
  const assets = [];

  Object.entries(sourceAttrs).forEach(([tag, attr]) => {
    const tags = cheerioData(tag).toArray();

    tags.map((tagItem) => cheerioData(tagItem))
      .filter((cheerioTag) => cheerioTag.attr(attr))
      .filter((filteredTag) => new URL(filteredTag.attr(attr), origin).origin === origin)
      .forEach((resultedTag) => {
        const url = new URL(resultedTag.attr(attr), origin);
        const filename = urlToFilename(`${url.hostname}${url.pathname}`);
        const filepath = path.join(assetsDir, filename);
        assets.push({ url, filename });
        resultedTag.attr(attr, filepath);
      });
  });
  return { html: cheerioData.html(), assets };
};

const downloadAsset = async (dirname, asset) => {
  const { url, filename } = asset;
  return axios.get(url.toString(), { responseType: 'arraybuffer' }).then((response) => {
    const assetPath = path.join(dirname, filename);
    return fs.writeFile(assetPath, response.data);
  });
};

const pageLoader = (pageUrl, outputDir = '') => {
  log('url', pageUrl);
  log('output directory', outputDir);
  const url = new URL(pageUrl);
  const slug = `${url.hostname}${url.pathname}`;
  const mainFile = urlToFilename(slug);
  const mainFileExtension = path.extname(mainFile) === '.html' ? '' : '.html';
  const pathToProjectDir = path.resolve(process.cwd(), outputDir);
  const pathToMainFile = path.join(pathToProjectDir, `${mainFile}${mainFileExtension}`);
  const assetsDirname = urlToDirname(slug);
  const assetsDirPath = path.join(pathToProjectDir, assetsDirname);

  let siteData;

  return axios
    .get(pageUrl)
    .then(({ data }) => {
      siteData = prepareAssets(data, url.origin, assetsDirname);

      return fs.access(assetsDirPath).catch(() => {
        log(`create assets directory - ${assetsDirPath}`);
        return fs.mkdir(assetsDirPath);
      });
    })
    .then(() => {
      log('Try to write main file');
      return fs.writeFile(pathToMainFile, siteData.html);
    })
    .then(() => {
      const tasks = siteData.assets.map((asset) => {
        log('asset', asset.url);
        return {
          title: asset.url.toString(),
          task: () => downloadAsset(assetsDirPath, asset),
        };
      });

      const listr = new Listr(tasks, { concurrent: true });
      return listr.run();
    })
    .then(() => pathToMainFile);
};

export default pageLoader;
