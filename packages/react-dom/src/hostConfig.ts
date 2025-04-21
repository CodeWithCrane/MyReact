import { FiberNode } from "../../react-reconciler/src/fiber";
import { Text } from "../../react-reconciler/src/workTag";
import { DOMElement, UpdateFiberProps } from "./SyntheticEvent";

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

export const createInstance = (type: string, props: any): Instance => {
	//todo 处理props
	const element = (document.createElement(type) as unknown) as DOMElement;
	UpdateFiberProps(element, props);
	return element;
	// const element = document.createElement(type);
	// UpdateFiberProps(element as DOMElement, props);
	// return element;
	//果然这种写法洗白了
};

export const createTextInstance = (content: string) => {
	return document.createTextNode(content);
};

export const appendInitialChild = (parent: Instance | Container, child: Instance) => {
	parent.appendChild(child);
};

export const appendChildToContainer = appendInitialChild;

export const commitUpdate = (fiber: FiberNode) => {
	switch (fiber.tag) {
		case HTMLElement:
			return UpdateFiberProps(fiber.stateNode, fiber.memoizedProps);
		case Text:
			const text = fiber.memoizedProps.content;
			return commitTextUpdate(fiber.stateNode, text);
		default:
			if (__DEV__) {
				console.warn("未实现的Update类型");
			}
			break;
	}
};

export const commitTextUpdate = (textInstance: TextInstance, content: string) => {
	textInstance.textContent = content;
};

export const removeChild = (child: Instance | TextInstance, container: Container) => {
	container.removeChild(child);
};

export const scheduleWithMircoTask = 
	typeof queueMicrotask === "function"
		? queueMicrotask
			: typeof Promise === "function"
				? (callback: (...args: any) => void) => Promise.resolve(null).then(callback)
					: setTimeout;