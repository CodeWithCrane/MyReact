import { Container } from "../../react-dom/src/hostConfig";
import {
	FiberNode,
	FiberRootNode
} from "./fiber";
import { HostRoot } from "./workTag";
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	UpdateQueue
} from "./updateQueue";
import { ReactElement } from "../../shared/ReactType";
import { scheduleUpdateOnFiber } from "./workLoop";
import { getUpdateLane } from "./fiberLanes";
import {
	unstable_ImmediatePriority,
	unstable_runWithPriority
} from "scheduler";

export const createContainer = (container: Container) => {
	const hostRootFiber = new FiberNode(HostRoot, null, {});
	const root = new FiberRootNode(container, hostRootFiber);
	hostRootFiber.updateQueue = createUpdateQueue();
	return root;
};

export const updateContainer = (root: FiberRootNode, element: ReactElement) => {
	unstable_runWithPriority(unstable_ImmediatePriority, () => {
		const hostRootFiber = root.current;
		const lane = getUpdateLane();
		const update = createUpdate<ReactElement | null>(element, lane);
		enqueueUpdate(
			hostRootFiber.updateQueue as UpdateQueue<ReactElement | null>,
			update,
			hostRootFiber,
			lane
		);
		console.warn("updateContainer");
		//这个没写,导致没有渲染成功
		scheduleUpdateOnFiber(hostRootFiber, lane);
		return element;
	});
};