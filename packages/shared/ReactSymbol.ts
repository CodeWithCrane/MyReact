const isSupported = typeof Symbol === "function" && Symbol.for;

export const REACT_ELEMENT_TYPE = isSupported ? Symbol.for("react.element") : 0xeac7;

export const REACT_FRAGMENT_TYPE = isSupported ? Symbol.for("react.fragment") : 0xeacb;

export const REACT_PROVIDER_TYPE = isSupported ? Symbol.for("react.provider") : 0xeac2;

export const REACT_CONTEXT_TYPE = isSupported ? Symbol.for("react.context") : 0xeacc;

export const REACT_MEMO_TYPE = isSupported ? Symbol.for("react.memo") : 0xead3;

export const REACT_LAZY_TYPE = isSupported ? Symbol.for("react.lazy") : 0xead4;

export const REACT_SUSPENSE_TYPE = isSupported ? Symbol.for("react.suspense") : 0xead1;