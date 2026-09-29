// radioButtonGroups.ts —— RadioButton 同组互斥的模块级注册表。
//
// 注意:本注册表必须放在普通模块顶层作用域(而非 <script setup> 内)——
// script setup 的顶层绑定会编译进组件 setup(),每个实例各自一份,同组实例
// 之间无法互相回写(QA fix round 1 实测)。本模块被所有 WuiRadioButton 实例
// 共享:同组 v-model 回写、前任 unchecked 派发、缺省父容器分组均依赖它。
//
// 组名解析:显式 groupName 由组件直接传入;缺省时组件用 implicitGroupId(parent)
// 按父容器分配自动组名(对应 WinUI「无 GroupName 时按最近公共父容器分组」语义)。

/** 注册表条目:组件实例侧的最小句柄(RadioButton.vue 实现)。 */
export interface RadioHandle {
  /** 该实例的 input 元素(挂载前为 null)。 */
  el(): HTMLInputElement | null
  /** 按 DOM 实际 checkedness 回写模型;emitEvents 时对变更派发 checked/unchecked。 */
  syncFromDom(emitEvents: boolean): boolean
}

/** 组名 → 实例句柄集合(同一注册表被所有实例共享,模块仅评估一次)。 */
const groupRegistry = new Map<string, Set<RadioHandle>>()
/** 无显式 groupName 时按父容器分配的自动组名缓存。 */
const parentGroupIds = new WeakMap<HTMLElement, string>()
let groupSeq = 0
/** 组内批量回写窗口标志:窗口内各实例 watcher/change 入口短路,防止级联(跨实例共享)。 */
let groupSyncing = false

/** 缺省分组:同父容器共用一个自动组名(首个实例分配);无父容器时独立成组。 */
export function implicitGroupId(parent: HTMLElement | null): string {
  if (parent) {
    let id = parentGroupIds.get(parent)
    if (id === undefined) {
      id = `wui-radio-group-${++groupSeq}`
      parentGroupIds.set(parent, id)
    }
    return id
  }
  return `wui-radio-standalone-${++groupSeq}`
}

/** 把实例句柄登记进组(空组名不登记:原生语义中空 name 不构成互斥组)。 */
export function registerHandle(name: string, handle: RadioHandle): void {
  if (name === '') return
  let set = groupRegistry.get(name)
  if (!set) {
    set = new Set()
    groupRegistry.set(name, set)
  }
  set.add(handle)
}

/** 把实例句柄移出组(组件卸载/换组时调用;空组随之删除,避免累积)。 */
export function unregisterHandle(name: string, handle: RadioHandle): void {
  if (name === '') return
  const set = groupRegistry.get(name)
  if (!set) return
  set.delete(handle)
  if (set.size === 0) groupRegistry.delete(name)
}

/** 把 DOM 实际状态回写给同组其他实例(调用方自身已按目标值落 DOM)。 */
export function syncGroupPeers(name: string, self: HTMLInputElement, emitEvents: boolean): void {
  if (name === '') return
  const set = groupRegistry.get(name)
  if (!set) return
  for (const peer of set) {
    if (peer.el() === self) continue
    peer.syncFromDom(emitEvents)
  }
}

/** 在批量回写窗口内执行 fn:窗口期间 isGroupSyncing() 为真,实例侧同步入口全部短路。 */
export function withGroupSync<T>(fn: () => T): T {
  groupSyncing = true
  try {
    return fn()
  } finally {
    groupSyncing = false
  }
}

/** 当前是否处于组内批量回写窗口(实例侧 watcher/change 入口据此短路)。 */
export function isGroupSyncing(): boolean {
  return groupSyncing
}
