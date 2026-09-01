import { enableMapSet } from "immer";

// Immer's Map/Set support has to be enabled before the first draft containing a
// Map or a Set is produced. Stores are created - and, with the `persist`
// middleware, rehydrated - while their module is being evaluated, so this has to
// happen at module scope rather than during application startup. Every store
// module imports this one for that side effect.
enableMapSet();
