import { scheduleWithMircoTask } from "hostConfig";
import { beginWork } from "./beginWork";
import { commitHookEffectListDestroy, commitHookEffectListUnmount, commitMutationEffects } from "./commitWork";
import { completeWork } from "./completeWork";
import { HookHasEffect } from "./effectTag";
import { createWorkInProgress, FiberNode, FiberRootNode, PendingPassiveEffects } from "./fiber";
import { MutationMask, NoFlags, PassiveMask } from "./fiberFlags";
import { getHighestPriorityLane, getNextLane, Lane, lanesToSchedulerPriority, markRootFinished, mergeLanes, NoLane, NoLanes, SyncLane } from "./fiberLanes";
import { flushSyncCallbacks, pushSyncCallback } from "./SyncTaskQueue";
import { HostRoot } from "./workTag";
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority,
	unstable_cancelCallback,
	unstable_shouldYield
} from "scheduler";

let workInProgress: FiberNode | null = null;
let renderLane: Lane = NoLane;
let hasPassiveEffects: Boolean = false;

// type WorkStatus = number;
//工作中的状态
const Initial = 0;
//并发中间状态
const Interrupted = 1;
//完成状态
const Completed = 2;
//未完成状态,不用进入commit阶段
const Incompleted = 3;
//全局工作状态
let workStatus: number = Initial;

//标记并调度更新
export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	//从当前到根结点之间的所有节点都打上标记
	const root = markUpdateLaneFromFiberToRoot(fiber);
	markRootUpdated(root, lane);//根节点打上标记
	ensureRootIsScheduled(root);//调度更新
};

//调度阶段入口
function ensureRootsScheduled(root: FiberRootNode) {
	const updateLane = getNextLane(root);//获取调度优先级
	const callback = root.callback;//获取回调函数

	//如果callback不为空,取消callabck
	if (callback !== null) {
		unstable_cancelCallback(callback);
	}

	//当前优先级为NoLane
	if (updateLane === NoLane) {
		root.callback = null;
		root.callbackPriority = NoLane;
		return;
	}

	const currentPriority = updateLane;
	const prevPriority = root.callbackPriority;

	//判断当前的优先级和之前的优先级是否相同
	if (currentPriority === prevPriority) {
		return;
	}

	let newCallback = null;

	if (__DEV__) {
		console.log(`在${updateLane === SyncLane ? "宏" : "微"}任务中调度优先级:`, updateLane);
	}

	if (updateLane === SyncLane) {
		//同步优先级 用微任务调度
		pushSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));//执行函数入队
		scheduleWithMircoTask(flushSyncCallbacks);//执行更新
	} else {
		//其他优先级 用宏任务调度
		const schedulerPriority = lanesToSchedulerPriority(updateLane);
		const scheduleWithMacroTask = scheduleCallback;
		newCallback = scheduleWithMacroTask(f
			scheduleByMacroTask,
			performConcurrentWorkOnRoot.bind(null, root)
		);
	}

	root.callback = newCallback;
	root.callbackPriority = currentPriority;
}I

function markUpdateLaneFromFiberToRoot(fiber: FiberNode) {
	let node = fiber, parent = node.return;

	while (parent !== null) {
		parent.childLanes = mergeLanes(parent.childLanes, lane);

		const alternate = parent.alternate;
		if (alternate !== null) {
			alternate.childLanes = mergeLanes(alternate.childLanes, lane);
		}

		node = parent;
		parent = node.return;
	}

	if (node.tag === HostRoot) {
		return node.stateNode;
	}

	return null;
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
) {
	//执行useEffect的回调
	const callback = root.callback;
	const isFlushed = flushPassiveEffects(root.pendingPassiveEffects);

	//root.callback !== callback,有以下几种可能
	//1.任务中断
	//2.重新调度
	//3.并发更新
	//表示当前任务已经中断或者过时
	if (isFlushed) {
		if (root.callback !== callback) {
			return null;
		}
	}

	//获取更新优先级
	const lane = getNextLane(root);

	if (lane === NoLane) {
		return;
	}

	//判断是否为同步更新
	const isSync = (lane === SyncLane) || didTimeout;

	//进入render阶段
	const status = renderRoot(root, lane, !isSync);

	//根据返回的状态来判断
	switch (status) {
		//中断
		case Interrupted:
			if (root.callback !== callback) {
				return null;
			}
			return performConcurrentWorkOnRoot.bind(null, root);
		//已完成
		case Completed:
			const finishedWork = root.current.alternate;
			root.finishedWork = finishedWork;
			root.finishedLane = lane;
			renderLane = NoLane;
			commitRoot(root);
			break;
		//未完成
		case Incompleted:
			renderLane = NoLane;
			ensureRootIsScheduled(root);
			break;
		default:
			if (__DEV__) {
				console.error("还未实现的并发更新结束状态");
			}
	}
}

function performSyncWorkOnRoot(root: FiberRootNode) {
	const lane = getNextLane(root.pendingLanes);

	//判断是否为同步优先级,如果不是同步优先级,重新调度
	if (lane !== SyncLane) {
		ensureRootIsScheduled(root);
		return;
	}

	const status = renderRoot(root, lane, false);

	switch (status) {
		//已完成
		case Completed:
			const finishedWork = root.current.alternate;
			root.finishedWork = finishedWork;
			root.finishedLane = lane;
			renderLane = NoLane;
			commitRoot(root);
			break;
		//未完成
		case Incompleted:
			renderLane = NoLane;
			ensureRootIsScheduled(root);
			break;
		default:
			if (__DEV__) {
				console.error("还未实现的同步更新结束状态");
			}
	}
}

let count = 0;

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	root.finishedWork = null;
	root.finishedLane = NoLane;
	workInProgress = createWorkInProgress(root.current, {});
	renderLane = lane;

	workStatus = Initial;
}

function renderRoot(
	root: FiberRootNode,
	lane: Lane,
	enableTimeSlice: boolean
) {
	if (__DEV__) {
		console.log(`开始${enableTimeSlice ? "并发" : "同步"}更新`);
	}

	if (renderLane !== lane) {
		prepareFreshStack(root, lane);
	}

	do {
		try {
			enableTimeSlice ? workLoopConcurrent() : workLoopSync();
			break;
		} catch (err) {
			console.error("workLoop发生错误", err);
			count ++;
			if (count > 20) {
				break;
				console.warn("brreak")
			}
		}
	} while (true)

	if (workStatus !== Initial) {
		return workStatus;
	}

	//中断执行(开启时间切片,并且workInProgress存在)
	if (enableTimeSlice && workInProgress !== null) {
		return Interrupted;
	}

	//render阶段执行完workInProgress应该为空
	if (!enableTimeSlice && workInProgress !== null && __DEV__) {
		console.error("render结束workInProgress不应该不是null")
	}

	return Completed;
}

function workLoopSync() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function workLoopConcurrent() {
	while (workInProgress !== null && !unstable_shouldYield()) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, renderLane);
	fiber.memoizedProps = fiber.pendingProps;

	if (next === null) {
		completeUnitOfWork(fiber);
	} else {
		workInProgress = next;
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;

	do {
		completeWork(node);

		if (node.sibling !== null) {
			workInProgress = node.sibling;
			return;
			//为什么不是continue
		}

		node = node.return;
		workInProgress = node;
	} while (node !== null)
}

//commit阶段主要任务
//1.fibr树的切换
//2.执行Placement对应的操作
function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;

	if (finishedWork === null) {
		return;
	}

	if (__DEV__) {
		console.warn("commit阶段开始", finishedWork);
	}

	const lane = root.finishedLane;

	if (lane === NoLane && __DEV__) {
		console.error("commit阶段finishedLane不应该是Nolane");
	}

	//重置
	root.finishedWork = null;
	root.finishedLane = NoLane;

	markRootFinished(root, lane);

	//处理PassiveEffect,即useEffect的回调
	if (
		(finishedWork.flags & PassiveMask) !== NoFlags ||
		(finishedWork.subtreeFlags & PassiveMask) !== NoFlags
	) {
		if (!hasPassiveEffects) {
			hasPassiveEffects = true;
			//调度副作用
			scheduleCallback(NormalPriority, () => {
				//执行副作用
				flushPassiveEffects(root.pendingPassiveEffects);
				return;
			})
		}
	}

	//判断是否有三个子阶段
	const hasEffect = (finishedWork.flags & (MutationMask | PassiveMask)) !== NoFlags;
	const subtreeHasEffect = (finishedWork.subtreeFlags & (MutationMask | PassiveMask)) !== NoFlags;

	if (hasEffect || subtreeHasEffect) {
		//before mutation
		//mutaion
		//layout
		commitMutationEffects(finishedWork);
	
		root.current = finishedWork;

		commitLayoutEffects(finishedWork, root);
	} else {
		root.current = finishedWork;
	}

	hasEffect = false;
	ensureRootIsScheduled(root);
	//为啥最后还要调度一次呢，因为在这个过程中可能会触发新的更新
}

//执行effect的清理函数，然后在重新渲染(performSync/ConcurrentWorkOnRoot)
function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	pendingPassiveEffects.umount.forEach((effect) => {
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffects.umount = [];

	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListDestroy(Passive | HookHasEffect, effect)
	});
	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListCreate(Passive | HookHasEffect, effect)
	});
	pendingPassiveEffects.update = [];

	flushSyncCallbacks();
}