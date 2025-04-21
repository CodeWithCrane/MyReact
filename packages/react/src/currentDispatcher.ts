import { Deps } from "../../react-reconciler/src/fiberHooks";
import { Action, Context } from "../../shared/ReactType";

export interface Dispatcher {
	useState: <S> (state: (() => S) | S) => [S, Dispatch<S>];
	useEffect: (callback: (() => void) | void, deps: any[] | void) => void;
	useTransition: () => [boolean, (callback: () => void) => void];
	useRef: <T> (value) => { current: T };
	useContext: <T> (context: Context<T>) => T;
	useMemo: <T> (calculate: () => T, deps: Deps | undefined) => T;
	useCallback: <T> (callback: T, deps: Deps | undefined) => T;
}

export type Dispatch<S>  = (action: Action<S>) => void;

const currentDispatcher: { current: Dispatcher | null} = {
	current: null
};

export const getDispatcher = (): Dispatcher => {
	const dispatcher = currentDispatcher.current;

	if (dispatcher === null) {
		throw new Error("hook只能在函数组件使用");
	}

	return dispatcher;
};

export default currentDispatcher;