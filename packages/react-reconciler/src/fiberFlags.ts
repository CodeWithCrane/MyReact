export type Flags = number;

export const NoFlags = 0b00000000;
export const Placement = 0b00000001;
export const Update = 0b00000010;
export const ChildDeletion = 0b00000100;

//mutation的意思是突变，Mutation表示插入/移动/更新/删除
export const MutationMask = Placement | Update | ChildDeletion;

//表示当前fiber有useEffect
export const PassiveEffect = 0b00001000;
//表示当前fiber需要触发effect的情况,有useEffect或者卸载组件
export const PassiveMask = PassiveEffect | ChildDeletion;

export const Ref = 0b00010000;