// Module shim for @types/tippy.js (which only ships a global namespace).
// Lets us `import tippy from 'tippy.js'` with the same types.

declare module 'tippy.js' {
  import type { Tippy } from 'tippy.js/global'
  export type Instance = Tippy
  const tippy: Tippy.TippyFunction
  export default tippy
}
