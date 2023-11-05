install:
	npm install --force
lint:
	npx eslint .
link:
	npm link
test:
	npm test
test-coverage:
	npm test -- --coverage --coverageProvider=v8
test1:
	node --experimental-vm-modules node_modules/jest/bin/jest.js ./js_l3_page_loader3_project-main 2/__tests__/20-index.test.js