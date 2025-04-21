import { Container } from "hostConfig";
import { createContainer, updateContainer } from "../../react-reconciler/src/fiberReconciler";
import { ReactElement } from "../../shared/ReactType";
import { initEvent } from "./SyntheticEvent";

export function createRoot(container: Container) {
	const root = createContainer(container);

	return {
		render(element: ReactElement) {
			console.warn("render方法开始执行");
			initEvent(container, "click");
			return updateContainer(root, element);
		}
	};
}