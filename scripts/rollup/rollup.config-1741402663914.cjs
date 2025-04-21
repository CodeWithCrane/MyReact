'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var commonjs = require('@rollup/plugin-commonjs');
var typescript = require('@rollup/plugin-typescript');
var replace = require('@rollup/plugin-replace');
var generatePackageJson = require('rollup-plugin-generate-package-json');
var alias = require('@rollup/plugin-alias');

const sourceDir$1 = path.resolve(__dirname, "../../packages/react");
const distDir$1 = path.resolve(__dirname, "../../dist/node_modules/react");

var reactConfig = [
	//react
	{
		input: path.join(sourceDir$1, "index.ts"),
		output: {
			file: path.join(distDir$1, "index.js"),
			name: "react",
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
				inputFolder: sourceDir$1,
				outputFolder: distDir$1,
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
		input: path.resolve(sourceDir$1, "src/jsx.ts"),
		output: [
			//jsx-runtime
			{
				file: path.resolve(distDir$1, "jsx-runtime.js"),
				name: "jsx-runtime",
				format: "umd",
			},
			//jsx-dev-runtime,
			{
				file: path.resolve(distDir$1, "jsx-dev-runtime.js"),
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

//react-dom包的路径
const sourceDir = path.resolve(__dirname, "../../packages/react-dom");
//react-dom产物路径
const distDir = path.resolve(__dirname, "../../dist/node_modules/react-dom");


var reactDomConfig = [
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
];

// export default {
// 	[...reactConfig, ...reactDomConfig]
// };

// export default () => {
// 	return [...reactConfig, ...reactDomConfig];
// };

var dev_config = [
	...reactConfig,
	...reactDomConfig
];

exports.default = dev_config;
