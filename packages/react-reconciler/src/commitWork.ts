import { appendChildToContainer, commitUpdate, Container, Instance, removeChild } from "../../react-dom/src/hostConfig";
import { HookHasEffect } from "./effectTag";
import { FiberNode, FiberRootNode, PendingPassiveEffects } from "./fiber";
import { ChildDeletion, Flags, MutationMask, NoFlags, PassiveEffect, PassiveMask, Placement, Ref, Update } from "./fiberFlags";
import { Effect, FCUpdateQueue } from "./fiberHooks";
import { FunctionComponent, HostRoot, HTMLElement, Text } from "./workTag";

let next: FiberNode | null = null;

export function commitEffects(
	type: "mutation" | "layout",
	mask: Flags,
	callback: (fiber: FiberNode, root: FiberRootNode) => void
) {
	return (finishedWork: FiberNode, root: FiberRootNode) => {
		next = finishedWork;

		while (next !== null) {
			const child: FiberNode | null = next.child;

			if ((next.subtreeFlags & (MutationMask | PassiveMask)) !== NoFlags && child !== null) {
				//说明子树存在副作用，继续向下遍历
				next = child;
			} else {
				//这里去掉了标签,可能会有问题
				console.warn("这里去掉了up标签,可能会有问题");
				while (next !== null) {
					//进入else分支的条件是subtreeFlags没有标记,或者child不是null
					//我这里有个疑问,没有打标为啥还要执行commitMutationEffectOnFiber呢?
					//1.在if分支里面,我们判断的是subtreeFlags而不是flags
					//2.对于commitMutationOnFiber,还是要根据标签来判断具体的行为
					callback(next, root);

					const sibling: FiberNode | null = next.sibling;

					if (sibling !== null) {
						next = sibling;
						break;
					}

					next = next.return;
				}
			}
		}
	}
}

export function commitMutationEffectsOnFiber(
	finishedWork: FiberNode,
	root: FiberRootNode
) {
	const flags = finishedWork.flags;
	const current = finishedWork.alternate;

	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
	}

	if ((flags & Update) !== NoFlags) {
		commitUpdate(finishedWork);
		finishedWork.flags &= ~Update;
	}

	if ((flags & ChildDeletion) !== NoFlags) {
		const deletions = finishedWork.deletions;

		if (deletions !== null) {
			deletions.forEach((item) => {
				commitDeletion(item, root);
			})
		}

		finishedWork.flags &= ~ChildDeletion;
	}

	if ((flag & PassiveEffect) !== NoFlags) {
		//收集回调
		commitPassivEffect(finishedWork, root, "update");
		finishedWork.flags &= ~PassiveEffect;
	}

	if ((flags & Ref) !== NoFlags && tag === HTMLElement) {
		if (current !== null) {
			safelyDetachRef(current);
		}
	}
};

function commitLayoutEffectsOnFiber(
	finishedWork: FiberNode,
	root: FiberRootNode
) {
	const { flags, tag } = finishedWork;

	if ((flags & Ref) !== NoFlags && tag === HTMLElement) {
		safelyAttachRef(finishedWork);
		finishedWork.flags &= ~Ref;
	}
}

function safelyAttachRef(fiber: FiberNode) {
	const ref = fiber.ref;

	if (ref !== null) {
		const instance = fiber.stateNode;

		if (typeof ref === "function") {
			ref(instance);
		} else {
			ref.current = instance;
		}
	}
}

function safelyDetachRef(current: FiberNode) {
	const ref = current.ref;

	if (ref !== null) {
		if (typeof ref === "function") {
			ref(null);
		} else {
			ref.current = null;
		}
	}
}

//收集回调
function commitPassivEffect(
	fiber: FiberNode,
	root: FiberRootNode,
	type: keyof PendingPassiveEffects
) {
	if (fiber.tag !== FunctionComponent || (type === "update" && ((fiber.flags & PassiveEffect) === NoFlags))) {
		return;
	}

	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	if (updateQueue !== null) {
		if (updateQueue.lastEffect === null && __DEV__) {
			console.error("当函数组件存在PassiveEffect时,不应该不存在effect");
		}
		root.pendingPassiveEffects[type].push(updateQueue.lastEffect as Effect);
	}
}

function commitDeletion(childToDelete: FiberNode, root: FiberRootNode) {
	//找到它对应的原生dom节点
	// let hostNode: FiberNode | null = null;
	//处理Fragment,如果是Fragment,那么要把Fragment下面的所有节点删除(所有兄弟节点)
	const hostChildrenToDelete: FiberNode[] = [];

	//递归子树
	commitNestedComponent(childToDelete, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case FunctionComponent:
				commitPassivEffect(unmountFiber, root, "unmount");
				return;
			case HTMLElement:
				recordHostChildrenToDelete(hostChildrenToDelete, unmountFiber);
				safelyDetachRef(unmountFiber);
				return;
			case Text:
				recordHostChildrenToDelete(hostChildrenToDelete, unmountFiber);
				return;
			default:
				if (__DEV__) {
					console.warn("未处理的unmount类型", unmountFiber);
				}
		}
	})

	//移除rootHostComponent的DOM
	if (hostChildrenToDelete.length) {
		const hostParent = getHostParent(childToDelete);
		if (hostParent !== null) {
			hostChildrenToDelete.forEach(child => {
				removeChild((child as FiberNode).stateNode, hostParent);
			})
		}
	}

	childToDelete.return = null;
	childToDelete.child = null;
}

function recordHostChildrenToDelete(
	hostChildrenToDelete: FiberNode[],
	unmountFiber: FiberNode
) {
	//找到第一个根host节点
	let lastNode = hostChildrenToDelete[children.length - 1];

	if (!lastNode) {
		hostChildrenToDelete.push(unmountFiber);
	} else {
		let node = lastNode.sibling;
		while (node !== null) {
			if (unmountFiber === node) {
				hostChildrenToDelete.push(unmountFiber);
			}
			node = node.sibling;
		}
	}
}

function commitNestedComponent(
	root: FiberNode,
	onCommitUnmount: (fiber: FiberNode) => void
) {
	let node = root;

	while (true) {
		onCommitUnmount(node);

		if (node.child !== null) {
			//向下遍历
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === root) {
			//终止条件
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === root) {
				return;
			}
			//向上递归
			node = node.return;
		}

		node.sibling.return = node.return;
		node = node.sibling;
	}
}

export const commitPlacement = (finishedWork: FiberNode) => {
	if (__DEV__) {
		console.warn("执行Placement操作", finishedWork);
	}

	//Parent DOM
	const hostParent = getHostParent(finishedWork);
	//finishedWork
	appendPlacementNodeIntoContainer(finishedWork, hostParent!);
};

//找到当前节点对应DOM节点的父节点
function getHostParent(fiber: FiberNode): Container | null {
	let parent = fiber.return;

	while (parent) {
		const tag = parent.tag;

		if (tag === HTMLElement) {
			return parent.stateNode as Container;
		} else if (tag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}

		parent = parent.return;
	}

	if (__DEV__) {
		console.warn("未找到host parent");
	}

	return null;
}

function appendPlacementNodeIntoContainer(finishedWork: FiberNode, hostParent: Container) {
	//fiber host
	if (finishedWork.tag === HTMLElement || finishedWork.tag === Text) {
		appendChildToContainer(finishedWork.stateNode, hostParent);
		// const instance = finishedWork.stateNode as Instance;
		// hostParent.append(instance);
		return;
	}

	const child = finishedWork.child;

	if (child !== null) {
		appendPlacementNodeIntoContainer(child, hostParent);

		let sibling = child.sibling;
		while (sibling !== null) {
			appendPlacementNodeIntoContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}

export const commitMutationEffects = commitEffects(
	"mutation",
	MutationMask | PassiveMask,
	commitMutationEffectsOnFiber
);

export const commitLayoutEffects = commitEffects(
	"layout",
	LayoutMask,
	commitLayoutEffectsOnFiber
);

function commitHookEffectList(flags: Flags, lastEffect: Effect, callback: (effect: Effect) => void) {
	let effect = lastEffect.next as Effect;

	do {
		if ((effect.tag & flags) === flags) {
			callback(effect);
		}
		effect = effect.next;
	} while (effect !== lastEffect.next)
}

export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destroy = effect.destroy;

		if (typeof destroy === "function") {
			destroy();
		}

		//卸载了,需要移除标记
		effect.tag &= ~HookHasEffect;
	})
}

//在组件更新阶段执行effect清理函数
export function commitHookEffectListDestroy(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destroy = effect.destroy;

		if (typeof destroy === "function") {
			destroy();
		}

		//没有卸载,不需要移除标记
	})
}

//在组件挂载或者更新阶段执行effect的创建函数（即useEffect/useLayoutEffect的回调），并且返回清理函数
export function commitHookEffectListCreate(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const create = effect.create;

		if (typeof create === "function") {
			effect.destroy = create();
		}
	})
}