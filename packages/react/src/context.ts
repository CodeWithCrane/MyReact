import {
	REACT_CONTEXT_TYPE,
	REACT_PROVIDER_TYPE
} from "../../shared/ReactSymbol";
import {
	Context,
	ContextProvider
} from "../../shared/ReactType";

export function createContext<T>(value: T): Context<T> {
	const context: Context<T> = {
		$$typeof: REACT_CONTEXT_TYPE,
		Provider: null,
		value
	};

	context.Provider = {
		$$typeof: REACT_PROVIDER_TYPE,
		context
	};

	return context;
}