import { ReactElement } from "../../shared/ReactType";
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostRoot,
	HTMLElement,
	Text
} from "./workTag";
import {
	reconcileChildFibersOnMount,
	reconcileChildFibersOnUpdate,
	cloneFibers
} from "./childFibers";
import { FiberNode } from "./fiber";
import { renderWithHook } from "./fiberHooks";
import { includeSomeLanes, Lane, NoLanes } from "./fiberLanes";
import { processUpdateQueue, UpdateQueue } from "./updateQueue";
import { pushContext } from "./fiberContext";

//判断是否应该更新,否则执行bailout策略
let shouldUpdate = false;

//递归中的递阶段
export const beginWork = (workInProgress: FiberNode, renderLane: Lane) => {
	//重置
	shouldUpdate = false;

	const current = workInProgress.alternate;

	//判断是否应该执行bailout策略
	if (current !== null) {
		const prevProps = current.memoizedProps;
		const nextProps = workInProgress.pendingProps;
		
		if (prevProps !== nextProps || current.type !== workInProgress.type) {
			//如果属性变化或者节点类型变化,说明应该更新
			shouldUpdate = true;
		} else {
			shouldUpdate = !includeSomeLanes(renderLane, current.lane);

			if (!shouldUpdate) {
				//todo 处理context
				return bailout(workInProgress, renderLane);
			}
		}
	}

	//重置优先级
	workInProgress.lanes = NoLanes;

	switch (workInProgress.tag) {
		case FunctionComponent:
			return updateFunctionComponent(workInProgress, renderLane);
		case HostRoot:
			return UpdateHostRoot(workInProgress, renderLane);
		case HTMLElement:
			return UpdateHTMLElement(workInProgress, renderLane);
		case Text:
			return null;
		case Fragment:
			return updateFragment(workInProgress);
		default:
			if (__DEV__) {
				console.warn("beginWork未实现的类型!");
			}
			break;
	}

	return null;
};

function updateFragment(workInProgress: FiberNode) {
	const children = workInProgress.pendingProps;
	reconcileChildren(workInProgress, children);
	return workInProgress.child;
}

function updateFunctionComponent(workInProgress: FiberNode, renderLane: Lane) {
	const current = workInProgress.alternate;
	if (current !== null && !shouldUpdate) {
		//todo bailoutHook
		return bailout(workInProgress, renderLane);
	}

	//调用函数组件来获得渲染后的值
	const children = renderWithHook(workInProgress, renderLane);
	reconcileChildren(workInProgress, children);
	return workInProgress.child;
}

function UpdateHostRoot(workInProgress: FiberNode, renderLane: Lane) {
	const baseState = workInProgress.memoizedState;
	const updateQueue = workInProgress.updateQueue as UpdateQueue<Element>;
	const pendingUpdate = updateQueue.shared.pending;

	const prevChildren = workInProgress.memoizedState;

	const { memoizedState } = processUpdateQueue(baseState, pendingUpdate, renderLane);
	workInProgress.memoizedState = memoizedState;

	const current = workInProgress.alternate;

	//如果current没有memoizedState,用新计算出的状态赋值
	if (current !== null && !current.memoizedState) {
		current.memoizedState = memoizedState;
	}

	const nextchildren = workInProgress.memoizedState;

	if (prevChildren === nextchildren) {
		return bailout(workInProgress, renderLane);
	}

	reconcileChildren(workInProgress, children);

	return workInProgress.child;
}

function UpdateHTMLElement(workInProgress: FiberNode) {
	const children = workInProgress.pendingProps.children;
	markRef(workInProgress.alternate, workInProgress);
	reconcileChildren(workInProgress, children);
	return workInProgress.child;
}

function reconcileChildren(workInProgress: FiberNode, children?: ReactElement) {
	const current = workInProgress.alternate;

	if (current !== null) {
		//update
		workInProgress.child = reconcileChildFibersOnUpdate(workInProgress, current.child, children);
	} else {
		//mount
		workInProgress.child = reconcileChildFibersOnMount(workInProgress, null, children);
	}
}

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
	const ref = workInProgress.ref;

	//首次渲染需要标记/更新阶段需要标记
	if (
		(current === null && ref !== null) ||
		(current !== null && current.ref !== ref)
	) {
		workInProgress.flags |= Ref;
	}
}

function bailout(workInProgress: FiberNode, lane: Lane) {
	//如果当前workInProgress树的childLanes不包括当前的renderLane,则跳过
	if (!includeSomeLanes(lane, workInProgress.childLanes)) {
		if (__DEV__) {
			console.log("bailout整颗子树", workInProgress);
		}
		return null;
	}

	if (__DEV__) {
		console.warn("bailout一个fiber", workInProgress);
	}

	//复用已有的fiber节点,而不是创建新的节点
	cloneFibers(workInProgress);

	return workInProgress.child;
}