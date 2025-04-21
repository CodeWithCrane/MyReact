export type Type = any;
export type Key = any;
export type Ref = any;
export type Props = any;

export interface ReactElement {
	$$typeof: symbol | number;
	type: Type;
	key: Key;
	ref: Ref;
	props: Props;
};

export type Action<State> = State | ((prev: State) => State);

export type Context<T> = {
	$$typeof: symbol | number;
	Provider: ContextProvider<T> | null;
	value: T;
};

export type ContextProvider<T> = {
	$$typeof: symbol | number;
	context: Context<T> | null;
};