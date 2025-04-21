import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from "../../shared/ReactSymbol";
import { Key, Props, ReactElement } from "../../shared/ReactType";
import { createFiberFromElement, createFiberFromFragment, createWorkInProgress, FiberNode } from "./fiber";
import { ChildDeletion, Placement } from "./fiberFlags";
import { Fragment, Text } from "./workTag";

type ExistingChildren = Map<string | number, FiberNode>;

function ChildReconciler(shouldTrackEffects: boolean) {
	function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
		if (!shouldTrackEffects) {
			return;
		}

		const deletions = returnFiber.deletions;
		if (deletions === null) {
			returnFiber.deletions = [childToDelete];
			returnFiber.flags |= ChildDeletion;
		} else {
			returnFiber.deletions?.push(childToDelete);
			// returnFiber.flags |= ChildDeletion;
			// 这句话没必要
		}
	}

	function deleteRemainingChildrenn(returnFiber: FiberNode, child: FiberNode | null) {
		if (!shouldTrackEffects) {
			return;
		}

		while (child !== null) {
			deleteChild(returnFiber, child);
			child = child.sibling;
		}
	}

	//单节点diff
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElement
	) {
		while (currentFiber !== null) {
			//update
			if (currentFiber.key === element.key) {
				//key相同
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					//是否为react元素
					if (currentFiber.type === element.type) {
						//处理Fragment,props赋值为element.props.children
						let props = element.props;
						if (element.type === REACT_FRAGMENT_TYPE) {
							props = element.props.children;
						}
						//1.key相同,type相同,可以复用
						const fiber = reuseFiber(currentFiber, element.props);
						fiber.return = returnFiber;
						//当前节点可复用,标记剩下的节点删除,传入的是currentFiber.sibling
						deleteRemainingChildrenn(returnFiber, currentFiber.sibling);
						return fiber;
					}
					//2.key相同,type不同,删除
					deleteChild(returnFiber, currentFiber);
					//退出,创建新的fiber
					break;
				} else {
					//不是react元素
					if (__DEV__) {
						console.warn("还未实现的react类型", element);
						//退出,创建新的fiber
						break;
					}
				}
			} else {
				//3.key不同,删除旧的,然后继续遍历sibling
				deleteChild(returnFiber, currentFiber);
				currentFiber = currentFiber.sibling;
			}
		}

		//根据element来创建fiber
		let fiber;
		if (element.type === REACT_FRAGMENT_TYPE) {
			fiber = createFiberFromFragment(element.props.children, element.key)
		} else {
			fiber = createFiberFromElement(element);
		}
		fiber.return = returnFiber;
		return fiber;
	}

	//处理文本
	function reconcileText(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: string | number
	) {
		if (currentFiber !== null) {
			//update
			if (currentFiber.tag === Text) {
				//类型没变,可以复用
				const fiber = reuseFiber(currentFiber, { content });
				fiber.return = returnFiber;
				deleteRemainingChildrenn(returnFiber, currentFiber.sibling);
				return fiber;
			}
			deleteChild(returnFiber, currentFiber);
			currentFiber = currentFiber.sibling;
		}

		const fiber = new FiberNode(Text, null, { content });
		fiber.return = returnFiber;
		return fiber;
	}

	//标记插入操作
	//当需要追踪副作用并且是挂载阶段/更新阶段(插入新的节点),标记插入
	function placeSingleChild(fiber: FiberNode) {
		if (shouldTrackEffects && fiber.alternate === null) {
			fiber.flags |= Placement;
		}
		return fiber;
	}

	function updateFromMap(
		returnFiber: FiberNode,
		existingChildren: ExistingChildren,
		index: number,
		element: any
	): FiberNode | null {
		const key = element.key !== null ? element.key : element.index;
		const fiber = existingChildren.get(key);

		//1.处理Text
		if (typeof element === "string" || typeof element === "number") {
			if (fiber) {
				if (fiber.tag === Text) {
					existingChildren.delete(key);
					return reuseFiber(fiber, { content: element + "" });
				}
			}
			return HostComponent(Text, null, { content: element + "" });
		}

		//2.处理ReactElement
		if (typeof element === "object" && element !== null) {
			switch (element.$$typeof) {
				case REACT_ELEMENT_TYPE:
					if (element.type === REACT_FRAGMENT_TYPE) {
						return updateFragment(
							returnFiber,
							fiber,
							element,
							key,
							existingChildren
						);
					}
					if (fiber) {
						if (fiber.type === element.type) {
							existingChildren.delete(key);
							return reuseFiber(fiber, element.props);
						}
					}
					return createFiberFromElement(element);
			}
		}

		//3.数组类型
		//处理HTML Element
		//<div>
		// <span>
		//	hello world
		// <span/>
		// <div/>
		if (Array.isArray(element)) {
			return updateFragment(
				returnFiber,
				fiber,
				element,
				key,
				existingChildren
			);
		}

		return null;
	}

	//多节点diff
	function reconcileChildrenArray(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null,
		newChild: any[]
	) {
		//记录最后一个不需要移动的旧节点的位置
		let lastPlacedIndex: number = 0;
		//创建的第一个fiber
		let firstNewFiber: FiberNode | null = null
		//创建的最后一个fiber
		let lastNewFiber: FiberNode | null = null

		//1.将current保存到map中
		const existingChildren: ExistingChildren = new Map();

		let current = currentFirstChild;
		while (current !== null) {
			const key = current.key !== null ? current.key : current.index;
			existingChildren.set(key, current);
			current = current.sibling;
		}

		for (let i = 0; i < newChild.length; i ++) {
			//2.遍历newChild,判断是否可复用
			const after = newChild[i];
			const newFiber = updateFromMap(returnFiber, existingChildren, i, after);

			//跳过无法生成fiber节点的情况,比如说element是非法类型
			if (newFiber === null) {
				continue;
			}

			//3.标记移动还是插入
			newFiber.index = i;
			newFiber.return = returnFiber;

			if (lastNewFiber === null) {
				lastNewFiber = newFiber;
				firstNewFiber = newFiber;
			} else {
				lastNewFiber.sibling = newFiber;
				lastNewFiber = lastNewFiber.sibling;
			}

			if (!shouldTrackEffects) {
				continue;
			}

			//判断一下旧节点的index是否小于最后一个不需要移动的旧节点的位置
			//可以这样理解,lastPlacedIndex是最后一个可复用节点的下标,因此它一定小于或者等于current.index
			const current = newFiber.alternate;
			if (current !== null) {
				const oldIndex = current.index;
				if (oldIndex < lastPlacedIndex) {
					//移动
					newFiber.flags |= Placement;
					continue;
				} else {
					//不移动
					lastPlacedIndex = oldIndex;
				}
			} else {
				//mount
				newFiber.flags |= Placement;
			}
		}


		//4.将map中剩下的标记为删除
		existingChildren.forEach((fiber) => {
			deleteChild(returnFiber, fiber);
		});

		return firstNewFiber;
	}

	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElement
	) {
		//检测并处理无 key 的顶层 Fragment 元素
		const isUnkeyedToLevelFragment =
			typeof newChild === "object" &&
			newChild !== null &&
			newChild.type === REACT_FRAGMENT_TYPE &&
			newChild.key === null;
		//isUnkeyedToLevelFragment表示没有key,并且是父元素的Fragment
		//<>
		// <div><div/>
		// <div><div/>
		//<>
		if (isUnkeyedToLevelFragment) {
			newChild = newChild?.props.children;
		}
		//处理ReactElement,包含单节点和多节点
		if (typeof newChild === "object" && newChild !== null) {
			// 处理多节点
			if (Array.isArray(newChild)) {
				return reconcileChildrenArray(returnFiber, currentFiber, newChild);
			}

			//处理单节点
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild));
				default:
					if (__DEV__) {
						console.warn("未实现的ReactElement类型");
					}
					break;
			}
		}

		//处理文本
		if (typeof newChild === "string" || typeof newChild === "number") {
			return placeSingleChild(reconcileText(returnFiber, currentFiber, newChild));
		}

		//兜底的情况,删除
		if (currentFiber !== null) {
			deleteRemainingChildrenn(returnFiber, currentFiber);
		}

		if (__DEV__) {
			console.warn("未实现的ReactElement类型", newChild);
		}

		return null;
	};
}

export const reconcileChildFibersOnUpdate = ChildReconciler(true);
export const reconcileChildFibersOnMount = ChildReconciler(false);

function reuseFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
	const clone = createWorkInProgress(fiber, pendingProps);
	clone.index = 0;
	clone.sibling = null;
	return clone;
}

function updateFragment(
	returnFiber: FiberNode,
	currentFiber: FiberNode | null,
	elements: any[],
	key: Key,
	existingChildren: ExistingChildren
) {
	let fiber;

	if (!currentFiber || currentFiber.tag !== Fragment) {
		//无旧 Fiber 或旧 Fiber 不是 Fragment 类型 
		fiber = createFiberFromFragment(elements, key);
	} else {
		//可复用旧 Fiber
		existingChildren.delete(key);
		fiber = reuseFiber(currentFiber, elements);
	}
	fiber.return = returnFiber;

	return fiber;
}

//复用当前的fiber
export function cloneFibers(workInProgress: FiberNode) {
	if (workInProgress.child === null) {
		return;
	}

	let fiber = workInProgress.child;
	let newFiber = createWorkInProgress(fiber, fiber.pendingProps);
	workInProgress.child = newFiber;
	newFiber.return = workInProgress;

	while (fiber.sibling !== null) {
		fiber = fiber.sibling;
		newFiber.sibling = createWorkInProgress(fiber, fiber.pendingProps);
		newFiber = newFiber.sibling;
		newFiber.return = workInProgress;
	}
}

