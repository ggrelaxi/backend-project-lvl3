import path from "node:path";
import url from "node:url";
import fs from "fs/promises";
import os from "os";
import nock from "nock";
import { pageLoader } from "../src/index";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getFixturePath = (filename) => path.resolve(__dirname, "..", "__fixtures__", filename);
const readFile = async (filepath) => await fs.readFile(getFixturePath(filepath), "utf-8");

const destinationDirname = "page-loader-";
const destinationFilesDirname = "ru-hexlet-io-courses_files";
const expectedResponseFilename = "expectedResponse.html";
const expectedContentFilename = 'ru-hexlet-io-courses.html'
const expectedContentDataFilename = 'expectedMainHtml.html'
const baseUrl = "https://ru.hexlet.io";
const pagePath = "/courses";
const pageUrl = new URL(pagePath, baseUrl);

let tempDir;
let tempFilesDir;

beforeEach(async () => {
	tempDir = await fs.mkdtemp(path.join(os.tmpdir(), destinationDirname));
	tempFilesDir = await fs.mkdir(path.join(tempDir, destinationFilesDirname), { recursive: true });
});

const assets = [
	{
		filename: "expectedCss.css",
		destinationFilename: 'ru-hexlet-io-assets-application.css',
		url: "/assets/application.css",
	},
	{
		filename: "expectedChildPage.html",
		destinationFilename: 'ru-hexlet-io-courses.html',
		url: "/courses",
	},
	{
		filename: "expectedPng.png",
		destinationFilename: 'ru-hexlet-io-assets-professions-nodejs.png',
		url: "/assets/professions/nodejs.png",
	},
	// {
	// 	filename: "expectedJs.js",
	// 	destinationFilename: 'ru-hexlet-io-assets-runtime.js',
	// 	url: "/assets/runtime.js",
	// },
];

nock.disableNetConnect();
const scope = nock(baseUrl).persist()

beforeAll(async () => {
	const expectedGetPageResponse = await readFile(expectedResponseFilename, "utf-8");
	const assetsResponses = assets.map(async ({ filename, url }) => {
		const data = await readFile(filename)
		return { data, url }
	})

	scope.get(pagePath).reply(200, expectedGetPageResponse);
	const assetsData = await Promise.all(assetsResponses)

	assetsData.forEach(({ data, url }) => {
		scope.get(url).reply(200, data);
	})
})

test("check success download page", async () => {
	await pageLoader(pageUrl, tempDir)

	assets.forEach(async ({ destinationFilename }) => {
		await expect(fs.access(path.join(tempFilesDir, destinationFilename))).resolves.not.toThrow();
	})

	const expectedContent = await readFile(expectedContentDataFilename);
	const downloadedContent = await fs.readFile(path.join(tempDir, expectedContentFilename), 'utf-8')
	expect(expectedContent).toEqual(downloadedContent);	
});

test('no response from download page', async () => {
	await expect(fs.access(path.join(tempDir, expectedContentFilename))).rejects.toThrow()
	
	const invalidUrl = 'http://invalid.abv';
	nock(invalidUrl).persist().get('/').replyWithError('');

	await expect(pageLoader(invalidUrl, tempDir)).rejects.toThrow()
}, 100000)

test('invalid site inner url', async () => {
	const invalidPage = '/badpage';
	const invalidUrl = new URL(invalidPage,baseUrl)
	
	scope.get(invalidUrl).reply(404)

	await expect(pageLoader(invalidUrl, tempDir)).rejects.toThrow()
})

test('write project to system folders', async () => {
	await expect(pageLoader(pageUrl.toString(), '/sys'))
      .rejects.toThrow();
})