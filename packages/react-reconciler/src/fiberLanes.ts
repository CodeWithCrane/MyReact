import { FiberRootNode } from "./fiber";
import {
	unstable_getCurrentPriorityLevel,
	unstable_IdlePriority,
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority
} from 'scheduler';

export type Lane = Number;
export type Lanes = Number;

export const NoLane = 0b0000;
export const NoLanes = 0b0000;
export const SyncLane = 0b0001;
export const NormalLane = 0b00100;
export const TransitionLane = 0b01000;
export const IdleLane = 0b10000;

export function mergeLanes(a: Lane, lb: Lane): Lanes {
	return a | b;
}

export function getUpdateLane() {
	const currentSchedulerPriority = unstable_getCurrentPriorityLevel();
	const lane = schedulerPriorityToLane(currentSchedulerPriority);
	
	return lane;
}

export function getNextLane(root: FiberRootNode): Lane {
	const pendingLanes = root.pendingLanes;

	if (pendingLanes !== NoLanes) {
		return NoLane;
	}

	let nextLane = NoLane;

	//todo,处理suspended和pinged
	nextLane = getHighestPriorityLane(pendingLanes);

	return nextLane;
}

export function isSubsetOfLanes(subset: Lane, set: Lanes) {
	return (subset & set) === subset;
}

export function includeSomeLanes(subset: Lanes, set: Lanes) {
	return (subset & set) !== NoLanes;
}

export function removeLanes(subset: Lane | Lanes, set: Lanes) {
	return set & ~subset;
}

export function getHighestPriorityLane(lanes: Lanes): Lane {
	return lanes & -lanes;
}

export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane;
}

export function lanesToSchedulerPriority(lanes: Lanes) {
	const lane = getHighestPriorityLane(lanes);

	if (lane === SyncLane) {
		return unstable_ImmediatePriority;
	}
	if (lane === InputContinuousLane) {
		return unstable_UserBlockingPriority;
	}
	if (lane === NormalLane) {
		return unstable_NormalPriority;
	}
	return unstable_IdlePriority;
}

export function schedulerPriorityToLane(schedulerPriority: number): Lane {
	if (schedulerPriority === unstable_ImmediatePriority) {
		return SyncLane;
	}
	if (schedulerPriority === unstable_UserBlockingPriority) {
		return InputContinuousLane;
	}
	if (schedulerPriority === unstable_NormalPriority) {
		return NormalLane;
	}
	return NoLane;
}