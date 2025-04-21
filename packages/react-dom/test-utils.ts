import { ReactElement } from '../shared/ReactType';
// @ts-ignore
import { createRoot } from './src/root';

export function renderIntoDocument(element: ReactElement) {
	const div = document.createElement('div');
	// element
	return createRoot(div).render(element);
}
