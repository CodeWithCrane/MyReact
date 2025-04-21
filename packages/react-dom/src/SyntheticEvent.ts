import { Container } from "hostConfig";
import { Props } from "../../shared/ReactType";
import {
	unstable_runWithPriority,
	unstable_ImmediatePriority, 
	unstable_NormalPriority,
	unstable_UserBlockingPriority
} from "scheduler";

export const elementPropsKey = "__props";

const EventTypes = ["click"];

export interface DOMElement extends Element {
	[elementPropsKey]: Props;
}

type EventCallback = (e: Event) => void;

interface Paths {
	capture: EventCallback[];
	bubble: EventCallback[];
}

interface SyntheticEvent extends Event {
	__stopProgation: boolean;
}

//dom[xxx] = ReactElement props
export function UpdateFiberProps(element: DOMElement, props: Props) {
	element[elementPropsKey] = props;
}

export function initEvent(container: Container, eventType: string) {
	if (!EventTypes.includes(eventType)) {
		console.warn("当前不支持", eventType, "事件");
		return;
	}

	if (__DEV__) {
		console.log("初始化事件:", eventType);
	}

	container.addEventListener(eventType, event => {
		dispatchEvent(container, eventType, event);
	});
}

function createSyntheticEvent(event: Event): SyntheticEvent {
	const syntheticEvent = event as SyntheticEvent;
	syntheticEvent.__stopProgation = false;
	const originStopProgation = event.stopPropagation;
	syntheticEvent.stopPropagation = () => {
		syntheticEvent.__stopProgation = true;
		if (originStopProgation) {
			originStopProgation();
		}
	}

	return syntheticEvent;
}

function dispatchEvent(container: Container, eventType: string, event: Event) {
	const target = event.target as DOMElement;

	if (target === null) {
		console.warn("事件不存在target", event);
	}

	//1.收集沿途的事件
	const { capture, bubble } = collectPaths(target, container, eventType);
	//2.构造合成事件
	const se = createSyntheticEvent(event);
	//3.遍历capture
	triggerEventFlow(capture, se);
	//4.遍历bubble
	if (!se.__stopProgation) {
		triggerEventFlow(bubble, se);
	}
}

function triggerEventFlow(callbacks: EventCallback[], se: SyntheticEvent) {
	for (let i = 0; i < callbacks.length; i++) {
		const callback = callbacks[i];
		unstable_ImmediatePriority(eventTypeToSchedulerPriority(se.type), () => {
			callback.call(null, se);
		});

		if (se.__stopProgation) {
			break;
		}
	}
}

function getEventCallbackNameFromEventType(eventType: string): string[] | undefined {
	return {
		click: ["onClickCapture", "onClick"]
	}[eventType];
}

//收集沿途事件
function collectPaths(target: DOMElement, container: Container, eventType: string) {
	const paths: Paths = {
		capture: [],
		bubble: []
	};

	while (target && target !== container) {
		//收集
		const elementProps = target[elementPropsKey];

		if (elementProps) {
			//click -> onClick onClickCapture
			const callbackNameList = getEventCallbackNameFromEventType(eventType);

			if (callbackNameList) {
				callbackNameList.forEach((callbackName, i) => {
					const eventCallback = elementProps[callbackName];

					if (eventCallback) {
						if (i === 0) {
							//capture
							paths.capture.unshift(eventCallback);
						} else {
							paths.bubble.push(eventCallback);
						}
					}
				})
			}
		}

		target = target.parentNode as DOMElement;
	}

	return paths;
}

function eventTypeToSchedulerPriority(eventType: string) {
	switch (eventType) {
		case: "click":
		case: "keydown":
		case: "keyup":
			return unstable_ImmediatePriority;
		case: "scroll":
			return unstable_UserBlockingPriority;
		default:
			return unstable_NormalPriority;
	}
}