import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from "../../shared/ReactSymbol";
import {
	ReactElement,
	Type,
	Key,
	Ref,
	Props
} from "../../shared/ReactType";

export const isValidElement = (object: any) => {
	return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
};

export const jsx = (type: Type, config: any, ...rest: any): ReactElement => {
	const props: Props = {};
	let key: Key = null;
	let ref: Ref = null;

	for (const prop in config) {
		if (prop === "key") {
			if (config[prop] !== undefined) {
				key = '' + config[prop];
			}
		} else if (prop === "ref") {
			if (config[prop] !== undefined) {
				ref = config[prop];
			}
		} else if (Object.prototype.hasOwnProperty.call(config, prop)) {
			props[prop] = config[prop];
		}
	}

	const length = rest.length;
	if (length) {
		props.children = length === 1 ? rest[0] : rest; 
	}

	return {
		$$typeof: REACT_ELEMENT_TYPE,
		type,
		key,
		ref,
		props
	}
};

export const jsxDEV = (type: Type, config: any, maybeKey: any): ReactElement => {
	const props: Props = {};
	let key: Key = null;
	let ref: Ref = null;

	if (maybeKey !== undefined) {
		key = maybeKey;
	}

	for (let prop in config) {
		if (prop === "key") {
			if (config[prop] !== undefined) {
				key = "" + config[prop];
			}
		} else if (prop === "ref") {
			if (config[prop] !== undefined) {
				ref = config[prop];
			}
		} else if (Object.prototype.hasOwnProperty.call(config, prop)) {
			props[prop] = config[prop];
		}
	}

	return {
		$$typeof: REACT_ELEMENT_TYPE,
		type,
		key,
		ref,
		props
	};
};

export const Fragment = REACT_FRAGMENT_TYPE;