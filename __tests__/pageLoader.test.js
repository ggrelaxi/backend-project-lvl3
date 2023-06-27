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
const embdedDestinationDirname = "embded";
const destinationFilename = "example-ru-page.html";
const baseUrl = "https://example.ru";
const pagePath = "/page";
const pageUrl = new URL(pagePath, baseUrl);

let expectedContent;
let tempDir;

beforeAll(async () => {
	expectedContent = await readFile(destinationFilename);
	tempDir = await fs.mkdtemp(path.join(os.tmpdir(), destinationDirname));
});

beforeEach(async () => {
	tempDir = await fs.mkdtemp(path.join(os.tmpdir(), destinationDirname));
});

nock.disableNetConnect();

test("check success download, base outputDir", async () => {
	const scope = nock(baseUrl).persist().get(pagePath).reply(200, expectedContent);

	await pageLoader(pageUrl.toString(), tempDir);

	const downloadedContent = await fs.readFile(path.join(tempDir, destinationFilename), "utf-8");

	expect(downloadedContent).toEqual(expectedContent);
});
