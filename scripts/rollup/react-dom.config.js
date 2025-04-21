import path from "path";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import replace from "@rollup/plugin-replace";
import generatePackageJson from "rollup-plugin-generate-package-json";
import alias from "@rollup/plugin-alias";

//react-dom包的路径
const sourceDir = path.resolve(__dirname, "../../packages/react-dom");
//react-dom产物路径
const distDir = path.resolve(__dirname, "../../dist/node_modules/react-dom");


export default [
	//react-dom
	{
		input: path.join(sourceDir, "index.ts"),
		//兼容react18的导出
		output: [
			{
				file: path.join(distDir, "index.js"),
				name: "ReactDOM",
				format: "umd",
			},
			{
				file: path.join(distDir, "client.js"),
				name: "client",
				format: "umd",
			},
		],
		external: [
			"react"
		],
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
					peerDependencies: {
						react: version
					},
					main: "index.js"
				})
			}),
			alias({
				entries: [
					{ find: "hostConfig", replacement: path.join(sourceDir, "src/hostConfig.ts")}
				]
			})
		]
	},
	//react-test-utils
	{
		input: path.join(sourceDir, "test-utils.ts"),
		//兼容react18的导出
		output: [
			{
				file: path.join(distDir, "test-utils.js"),
				name: "TestUtils",
				format: "umd",
			},
		],
		external: [
			"react", "react-dom"
		],
		plugins: [
			replace({
				__DEV__: false,
				preventAssignment: true
			}),
			commonjs(),
			typescript()
		]
	},
];