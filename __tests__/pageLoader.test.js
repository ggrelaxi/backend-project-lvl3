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
const pngImage = "ru-hexlet-io-assets-professions-nodejs.png";
const expectedResponseFilename = "expectedResponse.html";
const expectedContentFilename = "ru-hexlet-io-courses.html";
const baseUrl = "https://ru.hexlet.io";
const pagePath = "/courses";
const pageUrl = new URL(pagePath, baseUrl);

let expectedResponse;
let expectedContent;
let tempDir;
let tempFilesDir;

beforeAll(async () => {
	expectedResponse = await readFile(expectedResponseFilename);
	expectedContent = await readFile(expectedContentFilename);
});

beforeEach(async () => {
	tempDir = await fs.mkdtemp(path.join(os.tmpdir(), destinationDirname));
	tempFilesDir = await fs.mkdir(path.join(tempDir, destinationFilesDirname), { recursive: true });
});

nock.disableNetConnect();

test("check success download page", async () => {
	const img = await fs.readFile(path.join(process.cwd(), "/__fixtures__/ru-hexlet-io-assets-professions-nodejs.png"));
	const scope = nock(baseUrl).persist().get(pagePath).reply(200, expectedResponse);
	const png = nock(baseUrl).persist().get("/assets/professions/nodejs.png").reply(200, img);

	await pageLoader(pageUrl.toString(), tempDir);
	const downloadedContent = await fs.readFile(path.join(tempDir, expectedContentFilename), "utf-8");

	await expect(fs.access(path.join(tempDir, destinationFilesDirname, pngImage))).resolves.not.toThrow();

	expect(downloadedContent).toEqual(expectedContent);
});
