import { appendInitialChild, Container, createInstance, createTextInstance } from "../../react-dom/src/hostConfig";
import { FiberNode } from "./fiber";
import { Fragment, FunctionComponent, HostRoot, HTMLElement, Text } from "./workTag";
import { NoFlags, Update, Ref } from "./fiberFlags";
import { UpdateFiberProps } from "../../react-dom/src/SyntheticEvent";

//递归中的归阶段
export const completeWork = (workInProgress: FiberNode) => {
	const newProps = workInProgress.pendingProps;
	const current = workInProgress.alternate;

	switch (workInProgress.tag) {
		case HostRoot:
		case FunctionComponent:
		case Fragment:
			bubbleProperties(workInProgress);
			return null;
		case HTMLElement:
			if (current !== null && workInProgress.stateNode) {
				//update
				//1.props是否变化 比如className, onClick等
				//2.打标记 Update这个flag
				//3.标记Ref
				markUpdate(workInProgress);
				if (current.ref !== workInProgress.ref) {
					markRef(workInProgress);
				}
				UpdateFiberProps(workInProgress.stateNode, newProps);
			} else {
				//mount
				//1.构建DOM
				const instance = createInstance(workInProgress.type, newProps);
				//2.将DOM插入到DOM树中
				appendAllChildren(instance, workInProgress);
				workInProgress.stateNode = instance;
			}
			bubbleProperties(workInProgress);
			return null;
		case Text:
			if (current !== null && workInProgress.stateNode) {
				//update
				const oldText = current.memoizedProps.content;
				const newText = newProps.content;
				if (oldText !== newText) {
					markUpdate(workInProgress);
				}
			} else {
				//mount
				const instance = createTextInstance(newProps.content);
				workInProgress.stateNode = instance;
			}
			bubbleProperties(workInProgress);
			return null;
		default:
			if (__DEV__) {
				console.warn("未处理的completeWork情况", workInProgress);
			}
			break;
	}
};

function appendAllChildren(parent: Container, workInProgress: FiberNode) {
	let node = workInProgress.child;

	while (node !== null) {
		if (node.tag === HTMLElement || node.tag === Text) {
			// appendInitialChild(parent, node.stateNode);
			parent.appendChild(node.stateNode);
		} else if (node.child !== null) {
			node.child.return = node.return;
			node = node.child;
			continue;
		}

		if (node === workInProgress) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === workInProgress) {
				return;
			}
			node = node.return;
		}

		node.sibling.return = node.return;
		node = node.sibling;
	}
}

function bubbleProperties(workInProgress: FiberNode) {
	let subtreeFlags = NoFlags;
	let child = workInProgress.child;

	while (child !== null) {
		subtreeFlags |= child.flags;
		subtreeFlags |= child.subtreeFlags;
		child.return = workInProgress;
		child = child.sibling;
	}

	workInProgress.subtreeFlags = subtreeFlags;
}

function markUpdate(fiber: FiberNode) {
	fiber.flags |= Update;
}

function markRef(fiber: FiberNode) {
	fiber.flag |= Ref;
}