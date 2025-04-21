import { Key, Props, ReactElement, Ref } from "../../shared/ReactType";
import { Fragment, FunctionComponent, HTMLElement, WorkTag } from "./workTag";
import { Flags, NoFlags } from "./fiberFlags";
import { Container } from "../../react-dom/src/hostConfig";
import { UpdateQueue } from "./updateQueue";
import { Lanes, NoLanes } from "./fiberLanes";
import { Effect } from "./fiberHooks";
import { CallbackNode as Callback } from "scheduler";

export class FiberNode {
	type: any;//type表示每种类型的组件对应的具体类型
	tag: WorkTag;
	key: Key;
	ref: Ref;
	pendingProps: Props;//组件的初始状态
	memoizedProps: Props;
	
	return: FiberNode | null;
	sibling: FiberNode | null;
	child: FiberNode | null;
	index: number;
	
	flags: Flags
	subtreeFlags: Flags;
	lanes: Lanes;
	childLanes: Lanes;
	
	alternate: FiberNode | null;
	stateNode: any;//指向fiber对应的dom元素或者react组件
	updateQueue: unknown;
	memoizedState: any;
	deletions: FiberNode[] | null;

	constructor(tag: WorkTag, key: Key, pendingProps: Props) {
		this.tag = tag;
		this.type = null;
		this.key = key;
		this.ref = null;
		this.pendingProps = pendingProps;
		this.memoizedProps = null;
		
		this.return = null;
		this.sibling = null;
		this.child = null;
		this.index = 0;
		
		this.flags = NoFlags;
		this.subtreeFlags = NoFlags;
		this.lanes = NoLanes;
		this.childLanes = NoLanes;

		this.alternate = null;
		this.stateNode = null;
		this.updateQueue = null;
		this.memoizedState = null;
		this.deletions = null;
		
	}
}

export interface PendingPassiveEffects {
	umount: Effect[];
	update: Effect[];
}

export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;
	pendingLanes: Lanes;
	finishedLane: Lane;
	pendingPassiveEffects: PendingPassiveEffects;

	callback: Callback | null;
	callbackPriority: Lane;

	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		hostRootFiber.stateNode = this;
		this.finishedWork = null;
		this.pendingLanes = NoLanes;
		this.finishedLane = NoLane;
		this.pendingPassiveEffects = {
			umount: [],
			update: []
		};

		this.callback = null;
		this.callbackPriority = NoLane;
	}
}

export const createWorkInProgress = (current: FiberNode, pendingProps: Props) => {
	let workInProgress = current.alternate;
	
	if (workInProgress === null) {
		//mount
		workInProgress = new FiberNode(current.tag, current.key, pendingProps);
		workInProgress.stateNode = current.stateNode;
		workInProgress.alternate = current;
		current.alternate = workInProgress;
	} else {
		//update
		workInProgress.pendingProps = pendingProps;
		workInProgress.flags = NoFlags;
		workInProgress.subtreeFlags = NoFlags;
		workInProgress.deletions = null;
	}

	workInProgress.type = current.type;
	workInProgress.memoizedProps = current.memoizedProps;
	workInProgress.memoizedState = current.memoizedState;
	workInProgress.child = current.child;
	workInProgress.updateQueue = current.updateQueue;

	return workInProgress;
};

export function createFiberFromElement(element: ReactElement) {
	const { type, key, props } = element;
	let tag: WorkTag = FunctionComponent;
		
	if (typeof type === "string") {
		tag = HTMLElement;
	} else if (typeof type !== "function" && __DEV__) {
		console.warn("未定义的type", element);
	}

	const fiber = new FiberNode(tag, key, props);
	fiber.type = type;

	return fiber;
}

export function createFiberFromFragment(elements: any[], key: Key) {
	const fiber = new FiberNode(Fragment, key, elements);
	return fiber;
}