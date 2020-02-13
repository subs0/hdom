/**
 * @module core/registers
 */
import { fromAtom, sidechainPartition, fromRAF } from "@thi.ng/rstream"
import { peek } from "@thi.ng/arrays"
import { map } from "@thi.ng/transducers"
import { updateDOM } from "@thi.ng/transducers-hdom"
import { getIn } from "@thi.ng/paths"

import {
  DOM_NODE,
  $$_LOAD,
  $$_PATH,
  $$_ROOT,
  $$_VIEW,
  URL_FULL,
  URL_PRSE,
  ROUTER_PRFX,
  CFG_RUTR,
  CMD_SUB$,
  CMD_ARGS,
  CMD_SRC$,
  CMD_WORK,
  CFG_RUN$,
  CFG_STOR,
  CFG_ROOT,
  CFG_VIEW,
  CFG_DRFT,
  CFG_LOG$,
  CFG_KICK,
  CFG,
  BootCFG
} from "@-0/keys"

import { registerCMD, $store$, run$, registerCMDtoStore } from "@-0/spool"
import { parse, diff_keys } from "@-0/utils"

import { URL_DOM__ROUTE } from "../tasks"

import { DOMnavigated$ } from "../core/stream$"

/**
 *
 * expects payload of
 * ```
 * { target: { location: { href } }, currentTarget }
 * ```
 */
export const registerRouterDOM = router => {
  console.log("DOM Router Registered")

  const taskFrom = URL_DOM__ROUTE(router)
  return registerCMD({
    [CMD_SRC$]: DOMnavigated$,
    [CMD_SUB$]: "_URL_NAVIGATED$_DOM",
    [CMD_ARGS]: x => x,
    [CMD_WORK]: args =>
      run$.next(taskFrom({ [URL_FULL]: args[URL_FULL], [DOM_NODE]: args[DOM_NODE] }))
  })
}

const pre = (ctx, body) => (
  console.log(
    `
    no ${CFG_VIEW} component provided to boot({ CFG }). 
    Rendering state by route path
    `
  ),
  ["pre", JSON.stringify(body[1], null, 2)]
)

/**
 *
 * TODO:
 * import { registerCMDtoStore, ...spoolCMDs } from "@-0/spool"
 * import { ...myCMDs } from "./commands"
 *
 */

export const pair = (store, CMDS: Array<any /**Command*/> = []) => {
  // FIXME: Move stuff from inside boot to here and
  // pass the default commands to it and export a boot
  // (default only) function
  // TODO const [boot, CMDS] = cmds => { ... return [ CFG => {}, [{C},,,] ] }
  /**
   *
   * let allCommands = [...spoolCMDs, ...myCMDs, ...CMDS ]
   * let cmds = allCommands.reduce((a, c) => ({ cmd.sub$: registerCMDtoStore(store)(cmd) }), {})
   * return [ boot, cmds ]
   *
   */
}
/**
 *
 * export const [ boot, CMD ] = pair($store$)
 *
 */

// prettier-ignore
/**
 *
 * Options Object keys
 * - root   : DOM mount node
 * - view   : root data view (app) node
 * - draft  : state scaffolding Object
 * - router : url matching function or config Object
 * - trace  : string triggers logs prepended with it
 * - kick   : boolean triggers kickstart (for some sandboxes)
 * - prefix : ignore a part of the URL (e.g., gitub.io/<prefix>)
 *
 */
export const boot = (CFG: BootCFG) => {

  // TODO const [boot, CMDS] = cmds => { ... return [ CFG => {}, [{C},,,] ] }
  const root       = CFG[CFG_ROOT] || document.body
  const view       = CFG[CFG_VIEW] || pre
  const store      = CFG[CFG_STOR] || $store$
  const draft      = CFG[CFG_DRFT]
  const router     = CFG[CFG_RUTR]
  const log$       = CFG[CFG_LOG$]
  const kick       = CFG[CFG_KICK]
  
  // TODO const registered: [{C},,,] = registerCommands([...DEFAULT_CMDS(store), ...commands])
  
  const knowns     = Object.values(CFG)
  const prfx       = router[ROUTER_PRFX] || null

  const [, others] = diff_keys(knowns, CFG)
  const escRGX     = /[-/\\^$*+?.()|[\]{}]/g
  const escaped    = str => str.replace(escRGX, "\\$&")
  const RGX        = prfx ? new RegExp(escaped(prfx || ""), "g") : null

  if (router) registerRouterDOM(router)

  const state$ = fromAtom($store$)

  const shell = state$ => (
    log$ ? console.log(log$, state$) : null,
    state$[$$_LOAD]
      ? null
      : [view, [state$[$$_VIEW], getIn(state$, state$[$$_PATH])]]
  )

  if (draft) $store$.swap(x => ({ ...draft, ...x }))

  $store$.resetIn($$_ROOT, root)
  
  // TODO: opportunity for other implementations (e.g., React)
  state$.subscribe(sidechainPartition(fromRAF())).transform(
    map(peek),
    map(shell),
    updateDOM({
      root,
      span: false,
      ctx: {
        [CFG_RUN$]: x => run$.next(x),
        [CFG_STOR]: $store$,
        // remove any staging path components (e.g., gh-pages)
        [URL_PRSE]: () =>
          // console.log({ FURL }),
          parse(window.location.href, RGX), // <- 🔍
        ...others
      }
    })
  )
  // Just a little kick in the pants for those stubborn sandboxes
  if (kick) {
    DOMnavigated$.next({
      target: document,
      currentTarget: document
    })
  }
  // TODO return registered
}
