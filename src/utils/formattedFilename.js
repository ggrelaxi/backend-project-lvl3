export const formattedFilename = (name) => {
	const { host, pathname } = new URL(name);
	const regex = new RegExp(/[^a-zA-Z0-9\s]/, "g");

	return [`${host}${pathname === "/" ? "" : pathname}`.replaceAll(regex, "-"), "html"].join(".");
};
