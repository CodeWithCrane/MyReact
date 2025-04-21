import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import replace from "@rollup/plugin-replace";
import path from "path";

export default defineConfig({
	plugins: [
		react(),
		replace({
			__DEV__: true,
			preventAssignment: true
		})
	],
	resolve: {
		alias: [
			{
				find: "react",
				replacement: path.resolve(__dirname, "../../packages/react")
			},
			{
				find: "react-dom",
				replacement: path.resolve(__dirname, "../../packages/react-dom")
			},
			{
				find: "hostConfig",
				replacement: path.resolve(__dirname, "../../packages/react-dom/src/hostConfig")
			}
		]
	},
	optimizeDeps: {
		include: ["react", "react-dom", "react/jsx-runtime"]
	}
});