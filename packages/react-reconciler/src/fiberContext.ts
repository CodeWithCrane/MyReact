import { Context } from "../../shared/ReactType";

const contextStack: any[] = [];

export function pushContext<T>(context: Context<T>, value: T) {
	contextStack.push(context.value);
	context.value = value;
}

export function popContext<T>(context: Context<T>, value: T) {
	context.value = contextStack.pop();
}

