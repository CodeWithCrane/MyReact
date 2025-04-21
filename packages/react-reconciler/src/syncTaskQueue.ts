const syncQueue: ((...args: any) => boid)[] | null = null;
let isFlushingSyncQueue = false;

export function pushSyncCallback(callback: (...args) => void) {
	if (syncQueue === null) {
		syncQueue = [callback];
	} else {
		syncQueue.push(callback);
	}
}

export function flushSyncCallbacks() {
	if (!isFlushingSyncQueue && syncQueue) {
		isFlushingSyncQueue = true;
		try {
			syncQueue.forEach((callback) => callback());
		} catch (err) {
			if (__DEV__) {
				console.error("flushSyncCallback报错", err);
			}
		} finally {
			isFlushingSyncQueue = false;
			syncQueue = null;
		}
	}
}