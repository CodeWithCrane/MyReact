//我之前写的是jsx,是不是因为这个原因导致错误了
import { jsx, jsxDEV, isValidElement } from "./src/jsx";
import currentDispatcher, { Dispatcher, getDispatcher } from "./src/currentDispatcher";
import currentBatchConfig from "./src/currentBatchConfig";

export const useState: Dispatcher["useState"] = (initialState) => {
	const dispatcher = getDispatcher();
	return dispatcher.useState(initialState);
};

export const useEffect: Dispatcher["useEffect"] = (create, deps) => {
	const dispatch = getDispatcher();
	return dispatch.useState(create, deps);
}

export const useTransition: Dispatcher["useTransition"] = () => {
	const dispatch = getDispatcher();
	return dispatch.useTransition();
}

export const useRef: Dispatcher["useRef"] = () => {
	const dispatch = getDispatcher();
	return dispatch.useRef(value);
}

export const useContext: Dispatcher["useContext"] = (context) => {
	const dispatch = getDispatcher();
	return dispatch.useContext(context)
}

export const useMemo: Dispatcher["useMemo"] = (calculate, deps) => {
	const dispatch = getDispatcher();
	return dispatch.useMemo(calculate, deps);
}

export const useCallback: Dispatcher["useCallback"] = (callback, deps) => {
	const dispatch = getDispatcher();
	return dispatch.useCallback(callback, deps);
}

export const hooks_data_shared_layer = {
	currentDispatcher,
	currentBatchConfig
};

export const version = "0.0.0";
export const createElement = jsx;
export { isValidElement } from "./src/jsx";
//todo 根据环境区分

// export default {
// 	version: "0.0.0",
// 	createElement: jsx
// };