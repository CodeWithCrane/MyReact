// .eslint.config.mjs
import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import tsParser from "@typescript-eslint/parser";
import tsEslintPlugin from "@typescript-eslint/eslint-plugin";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"], // 定义适用的文件类型
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }, // 合并浏览器和 Node.js 的全局变量
      ecmaVersion: "latest", // 支持最新 ECMAScript 版本
      sourceType: "module", // 使用 ES 模块语法
      parser: tsParser, // 使用 TypeScript 解析器
    },
    plugins: {
      "@typescript-eslint": tsEslintPlugin
    },
    rules: {
      "no-unused-vars": "off",
      "no-case-declarations": "off", // 禁用 switch 语句中变量声明的检查
      "no-constant-condition": "off", // 禁用常量条件检查
      "@typescript-eslint/ban-ts-comment": "off", // 禁用 TypeScript 注释的检查
      "@typescript-eslint/no-explicit-any": "warn", // 警告使用 any 类型,
    }
  },
  eslint.configs.recommended, // 继承 ESLint 官方推荐的 JavaScript 配置
  // tseslint.configs.recommended, // 把这行去掉就对了,好奇怪啊
];