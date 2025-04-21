import { appendChildToContainer } from "hostConfig";
import { Dispatch } from "../../react/src/currentDispatcher";
import { Action } from "../../shared/ReactType";
import { isSubsetOfLanes, Lane, mergeLanes, NoLane } from "./fiberLanes";
import { FiberNode } from "./fiber";

export interface Update<S> {
	action: Action<S>;
	lane: Lane;
	next: Update<any> | null;
	hasEagerState: boolean;
	eagerState: S | null;
};

export interface UpdateQueue<S> {
	shared: {
		pending: Update<S> | null
	};
	dispatch: Dispatch<S> | null;
};

export const createUpdate = <S>(action: Action<S>, lane: Lane, hasEagerState = false, eagerState = null) => {
	return {
		action,
		lane,
		next: null,
		hasEagerState,
		eagerState
	};
};

export const createUpdateQueue = <S>() => {
	return {
		shared: {
			pending: null
		},
		dispatch: null
	} as UpdateQueue<S>;
};

export const enqueueUpdate = <S>(
	updateQueue: UpdateQueue<S>,
	update: Update<S>,
	fiber: FiberNode,
	lane: Lane
) => {
	const pending = updateQueue.shared.pending;

	if (pending === null) {
		update.next = update;
	} else {
		update.next = pending.next;
		pending.next = update;
	}

	updateQueue.shared.pending = update;

	fiber.lanes = mergeLanes(fiber.lanes, lane);
	const alternate = fiber.alternate;
	if (alternate) {
		alternate.lanes = mergeLanes(alternate.lanes, lane);
	}
};

export const processUpdateQueue = <S>(
	baseState: S,
	pendingUpdate: Update<S> | null,
	renderLane: Lane,
	onSkipUpdate?: <S> (update: Update<S>) => void
): {
	memoizedState: S,
	baseState: S,
	baseQueue: Update<S> | null
} => {
	const result: {
		memoizedState: S,
		baseState: S,
		baseQueue: Update<S>
	} = {
		memoizedState: baseState,
		baseState,
		baseQueue: null
	};

	if (pendingUpdate !== null) {
		const head = pendingUpdate.next;
		let update = pendingUpdate.next as Update<any>;

		let newBaseState = baseState;
		let first: Update<S> | null = null;
		let last: Update<S> | null = null;
		let finalState = baseState;

		do {
			const updateLane = update?.lane;

			if (!isSubsetOfLanes(updateLane, renderLane)) {
				//优先级不够,被跳过
				const clone = createUpdate(update.action, pendingUpdate.lane);

				onSkipUpdate?.(clone);

				//判断是不是第一个被跳过的
				if (frist === null) {
					first = clone;
					last = clone;
					newBaseState = finalState;
				} else {
					(last as Update<S>).next = clone;
					last = clone;
				}
			} else {
				//优先级足够
				if (last !== null) {
					//这里应该表示有update被跳过,所以需要克隆一下update链表
					const clone = createUpdate(update.action, NoLane);
					last.next = clone;
					last = clone;
				}

				const action = update.action;
				if (update.hasEagerState) {
					finalState = update.eagerState;
				} else {
					if (action instanceof Function) {
						finalState = action(baseState)
					} else {
						finalState = action;
					}
				}
			}

			update = update.next as Update<any>;
		} while (update !== head)

		//判断有没有update被跳过
		if (last === null) {
			newBaseState = finalState;
		} else {
			last.next = first;
		}

		result.memoizedState = finalState;
		result.baseState = newBaseState;
		result.baseQueue = last;
	}

	return result;
};