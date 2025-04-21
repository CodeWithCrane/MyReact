import path from "path";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import replace from "@rollup/plugin-replace";
import generatePackageJson from "rollup-plugin-generate-package-json";

const sourceDir = path.resolve(__dirname, "../../packages/react");
const distDir = path.resolve(__dirname, "../../dist/node_modules/react");

export default [
	//react
	{
		input: path.join(sourceDir, "index.ts"),
		output: {
			file: path.join(distDir, "index.js"),
			name: "React",
			format: "umd",
		},
		plugins: [
			replace({
				__DEV__: false,
				preventAssignment: true
			}),
			commonjs(),
			typescript(),
			generatePackageJson({
				inputFolder: sourceDir,
				outputFolder: distDir,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					main: "index.js"
				})
			}),
		]
	},
	//jsx-runtime
	{
		input: path.resolve(sourceDir, "src/jsx.ts"),
		output: [
			//jsx-runtime
			{
				file: path.resolve(distDir, "jsx-runtime.js"),
				name: "jsx-runtime",
				format: "umd",
			},
			//jsx-dev-runtime,
			{
				file: path.resolve(distDir, "jsx-dev-runtime.js"),
				name: "jsx-dev-runtime",
				format: "umd",
			}
		],
		plugins: [
			replace({
				__DEV__: false,
				preventAssignment: true
			}),
			commonjs(),
			typescript(),
		]
	}
];