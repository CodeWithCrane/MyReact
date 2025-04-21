import { FiberNode } from "./fiber";
import internals from "../../shared/internals";
import { Dispatch, Dispatcher } from "../../react/src/currentDispatcher";
import { createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue, UpdateQueue } from "./updateQueue";
import { Action, Context } from "../../shared/ReactType";
import { scheduleUpdateOnFiber } from "./workLoop";
import { getUpdateLane, NoLane } from "./fiberLanes";
import { Flags, PassiveEffect } from "./fiberFlags";
import { HookHasEffect, Passive } from "./effectTag";
import currentBatchConfig from "../../react/src/currentBatchConfig";

//当前正在渲染的节点
let currentlyRenderingFiber: FiberNode | null = null;
//当前正在处理的hook
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;

const { currentDispatcher } = internals;

interface Hook {
	memoizedState: any;
	updateQueue: unknown;
	next: Hook | null;
}

export interface Effect {
	tag: Flags;
	create: EffectCallbak | void;
	destroy: EffectCallbak | void;
	deps: Deps;
	next: Effect | null;
}

type EffectCallbak = () => void;
export type Deps = any[] | null;

export interface FCUpdateQueue<S> extends UpdateQueue {
	lastEffect: Effect | null;
	lastState: S;
}

export function createFCUpdateQueue<S>() {
	const queue = createUpdateQueue<S> as FCUpdateQueue<S>;
	queue.lastEffect = null;
	return queue;
}

export function renderWithHook(workInProgress: FiberNode, lane: Lane) {
	//赋值操作
	currentlyRenderingFiber = workInProgress;
	//重置操作
	workInProgress.memoizedState = null;
	workInProgress.updateQueue = null;
	renderLane = lane;

	const current = workInProgress.alternate;

	if (current !== null) {
		//update
		currentDispatcher.current = HooksDispatcherOnUpdate;
	} else {
		//mount
		currentDispatcher.current = HooksDispatcherOnMount;
	}

	//workInProgress.type函数组件的函数
	const Component = workInProgress.type;
	const props = workInProgress.pendingProps;
	const children = Component(props);

	//重置操作
	currentlyRenderingFiber = null;
	renderLane = NoLane;

	return children;
};

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState,
	useEffect: mountEffect,
	useTransition: mountTransition,
	useContext: readContext
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect,
	useTransition: updateTransition,
	useContext: readContext
};

function isHookEqual(nextDeps: Deps, prevDeps: Deps) {
	if (nextDeps === null || prevDeps === null) {
		return false;
	}

	for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
		if (!Object.is(prevDeps[i], nextDeps[i])) {
			return false;
		}
	}

	return true;
}

function mountCallback<T>(callback: T, deps: Deps | undefined) {
	const hook = mountWorkInProgressHook();
	const callbackDeps = deps === undefined ? null : deps;
	hook.memoizedState = [callback, callbackDeps];

	return callback;
}

function updateCallback<T>(callback: T, deps: Deps | undefined) {
	const hook = updateWorkInProgressHook();
	const callbackDeps = deps === undefined ? null : deps;
	const [prevCallback, prevDeps] = hook.memoizedState;

	if (callbackDeps !== null && isHookEqual(callbackDeps, prevDeps)) {
		return prevCallback;
	}

	hook.memoizedState = [callback, callbackDeps];

	return callback;
}

function mountMemo<T>(calculate: () => T, deps: Deps | undefined) {
	const hook = mountWorkInProgressHook();
	const memoDeps = deps === undefined ? null : deps;
	const result = calculate();
	hook.memoizedState = [result, memoDeps]

	return result;
}

function updateMemo<T>(calculate: () => T, deps: Deps | undefined) {
	const hook = updateWorkInProgressHook();
	const memoDeps = deps === undefined ? null : deps;
	const [prevResult, prevDeps] = hook.memoizedState;

	if (nextDeps !== null && isHookEqual(memoDeps, prevDeps)) {
		return prevResult;
	}

	const result = calculate();
	hook.memoizedState = [result, memoDeps];

	return result;
}

export function readContext<T>(context: Context<T>): T {
	const consumer = currentlyRenderingFiber as FiberNode;

	if (consumer === null) {
		throw new Error("只能在函数组件中实现");
	}

	return context.value;
}

function mountRef<T>(value: T): { current: T } {
	const hook = mountWorkInProgressHook();
	const ref = { current: value };
	hook.memoizedState = ref;

	return ref;
}

function updateRef<S>(value: T): { current: T } {
	const hook = updateWorkInProgressHook();
	return hook.memoizedState;
}

function mountTransition(): [boolean, (callback: () => void) => void] {
	const [isPending, setPending] = mountTransition();
	const hook = mountWorkInProgressHook();
	const startTransition = handleTransition.bind(null, setPending);
	hook.memoizedState = startTransition;

	return [isPending, startTransition];
}

function updateTransition(): [boolean, (callback: () => void) => void] {
	const [isPending] = updateTransition();
	const hook = updateWorkInProgressHook();
	const startTransition = hook.memoizedState;

	reteurn [isPending, startTransition];
}

function handleTransition(setPending: Dispatch<boolean>, callback: () => void) {
	setPending(true);
	const prevTransition = currentBatchConfig.transition;
	currentBatchConfig.transition = 1;
	callback();
	setPending(false);
	currentBatchConfig = prevTransition;
}

function mountEffect(create: EffectCallbak | void, deps: Deps | void) {
	const hook = mountWorkInProgressHook();
	deps = deps === undefined ? null : deps;

	//打上标记
	(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
	//挂载阶段需要执行create
	hook.memoizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		deps
	);
}

function updateEffect(create: EffectCallbak | void, deps: Deps | void) {
	const hook = updateWorkInProgressHook();
	deps = deps === undefined ? null : deps;
	let destroy: EffectCallbak | void;

	if (currentHook !== null) {
		const prevEffect = currentHook.memoizedState as Effect;
		destroy = prevEffect.destroy;

		//浅比较依赖
		if (deps !== null) {
			if (isHookEqual(deps, prevEffect.deps)) {
				//浅比较依赖,依赖相等
				hook.memoizedState = pushEffect(Passive, create, destroy, dep);
				return;
			}
		}

		//依赖不相等
		//打上标记
		(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
		//挂载阶段需要执行create
		hook.memoizedState = pushEffect(
			Passive | HookHasEffect,
			create,
			undefined,
			deps
		);
	}
}

function pushEffect(
	tag: Flags,
	create: EffectCallbak | void,
	destroy: EffectCallbak | void,
	deps: Deps
): Effect {
	const effect = {
		tag,
		create,
		destroy,
		deps,
		next
	};

	const fiber = currentlyRenderingFiber as FiberNode;
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;

	if (updateQueue === null) {
		updateQueue = createFCUpdateQueue();
		fiber.updateQueue = updateQueue;
		effect.next = effect;
		updateQueue.lastEffect = effect;
	} else {
		//插入effect
		const lastEffect = updateQueue.lastEffect;

		if (lastEffect === null) {
			effect.next = effect;
			updateQueue.lastEffect = effect;
		} else {
			const firstEffect = lastEffect.next;
			lastEffect.next = effect;
			effect.next = firstEffect;
			updateQueue.lastEffect = effect;
		}
	}

	return effect;
}

function mountState<S>(initialState: (() => S) | S): [S, Dispatch<S>] {
	//找到当前useState对应的hook数据
	const hook: Hook = mountWorkInProgressHook();
	let memoizedState;

	if (initialState instanceof Function) {
		memoizedState = initialState();
	} else {
		memoizedState = initialState;
	}

	const queue = createUpdateQueue<S>();
	hook.updateQueue = queue;
	hook.memoizedState = memoizedState;

	const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber!, queue as UpdateQueue<unknown>);
	queue.dispatch = dispatch;

	return [memoizedState, dispatch];
}

function updateState<S>(): [S, Dispatch<S>] {
	//找到当前hook对应的数据
	const hook = updateWorkInProgressHook();

	//计算新state逻辑
	const baseState = hook.memoizedState;
	const updateQueue = hook.updateQueue as UpdateQueue<S>;
	const pending = updateQueue.shared.pending;

	if (pending !== null) {
		const { memoizedState } = processUpdateQueue(baseState, pending, renderLane);
		hook.memoizedState = memoizedState;
	}

	return [hook.memoizedState, updateQueue.dispatch as Dispatch<S>];
}

function dispatchSetState<S>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<S>,
	action: Action<S>
) {
	const lane = getUpdateLane();
	const update = createUpdate(action, lane);
	enqueueUpdate(updateQueue, update);
	scheduleUpdateOnFiber(fiber, lane);
}

function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		updateQueue: null,
		next: null
	};

	if (workInProgressHook === null) {
		//mount时第一个hook
		if (currentlyRenderingFiber === null) {
			throw new Error("请在函数组件内部调用hook");
		} else {
			workInProgressHook = hook;
			currentlyRenderingFiber.memoizedState = workInProgressHook;
		}
	} else {
		workInProgressHook.next = hook;
		workInProgressHook = workInProgressHook.next;
	}

	return workInProgressHook;
}

function updateWorkInProgressHook(): Hook {
	let nextHook: Hook | null;

	if (currentHook === null) {
		//FunctionComponent Update时的第一个hook
		const current = (currentlyRenderingFiber as FiberNode).alternate;
		if (current !== null) {
			nextHook = current.memoizedState;
		} else {
			nextHook = null;
		}
	} else {
		//FunctionComponent Update时的后续的hook
		nextHook = currentHook.next;
	}

	if (nextHook === null) {
		//mount或者update
		throw new Error(`组件${currentlyRenderingFiber?.type}本次执行的hook比上次多`);
	}

	currentHook = nextHook as Hook;
	const hook: Hook = {
		memoizedState: nextHook.memoizedState,
		updateQueue: nextHook.updateQueue,
		next: null
	};

	//mount
	if (workInProgressHook === null) {
		//mount时第一个hook
		if (currentlyRenderingFiber === null) {
			throw new Error("请在函数组件呢调用hook");
		} else {
			workInProgressHook = hook;
			currentlyRenderingFiber.memoizedState = workInProgressHook;
		}
	} else {
		//mount时后续的hook
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}

	return workInProgressHook;
}