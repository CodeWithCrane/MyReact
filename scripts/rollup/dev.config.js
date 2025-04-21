import reactConfig from "./react.config";
import reactDomConfig from "./react-dom.config";

// export default {
// 	[...reactConfig, ...reactDomConfig]
// };

// export default () => {
// 	return [...reactConfig, ...reactDomConfig];
// };

export default [
	...reactConfig,
	...reactDomConfig
];