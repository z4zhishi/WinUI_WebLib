/**
 * AnimatedIcon 源约定 —— WinUI IAnimatedVisualSource2 的 Web 分层替代。
 *
 * 分层说明(阶段 7 务实裁剪,不引入 lottie):
 * - 本文件只约定「源对象接口」与 CSS/SVG 驱动的内置演示源。源是一份可序列化的声明数据
 *   (SVG 部件 + 状态机表),由 AnimatedIcon.vue 统一渲染并按状态驱动;
 * - 完整 Lottie 源体系(lottie-web 播放 LottieGen 产物)留后续:届时以 `kind: 'lottie'`
 *   扩展本判别联合(播放进度走 AnimatedIconSourceContext.progress),引入依赖前须登记
 *   docs/tools.md(当前为空表);AnimatedIcon 对未知 kind 走 FallbackIconSource。
 *
 * 状态串与 WinUI 一致(大小写敏感):AnimatedIcon.SetState 接受 "Normal"/"PointerOver"/
 * "Pressed"/"Disabled"(CK/WinUI-Reference/controls/dev/AnimatedIcon/AnimatedIcon.idl 的
 * StateProperty;内置源以 NormalToPointerOver_Start/End 等 marker 划分过渡段,
 * 见 AnimatedVisuals/*.cpp)。
 */

/** AnimatedIcon 播放状态机(WinUI 状态串)。 */
export type AnimatedIconState = 'Normal' | 'PointerOver' | 'Pressed' | 'Disabled'

/** 部件过渡速度档(映射 src/styles/animations.css 的时长 token)。 */
export type AnimatedIconTransitionSpeed = 'fast' | 'normal' | 'slow'

/** 过渡速度档 → animations.css 时长 token(与 Expander/ComboBox 同一取法)。 */
export const ANIMATED_ICON_TRANSITION_DURATION: Record<AnimatedIconTransitionSpeed, string> = {
  fast: 'var(--wui-duration-fast)', // 167ms
  normal: 'var(--wui-duration-normal)', // 240ms
  slow: 'var(--wui-duration-slow)', // 350ms
}

/** 部件在单个状态下的目标样式(仅限可被 CSS transition 平滑过渡的属性)。 */
export interface AnimatedIconPartState {
  /** CSS transform(作用于部件包围盒中心:transform-box: fill-box + origin center)。 */
  transform?: string
  /** 不透明度 0–1。 */
  opacity?: number
}

/** 源的一个 SVG 部件:静态标记 + 状态机表。 */
export interface AnimatedIconSourcePart {
  /** 部件名(渲染时写入 data-wui-part;同一源内须唯一)。 */
  readonly name: string
  /** 部件 SVG 片段(不含外层 <g>;fill/stroke 用 currentColor 继承控件前景)。 */
  readonly svg: string
  /** 状态 → 目标样式;未声明的状态回落 Normal(Disabled 的整体置灰由控件统一处理)。 */
  readonly states: Partial<Record<AnimatedIconState, AnimatedIconPartState>>
}

/**
 * 源约定。kind 为判别字段:本阶段只有 'css-svg';后续 Lottie 源以 'lottie' 扩展,
 * AnimatedIcon 渲染时对未知 kind / 缺失源走 FallbackIconSource(等价 WinUI 动画创建失败)。
 */
export interface AnimatedIconSource {
  readonly kind: 'css-svg'
  /** 源名(对照 WinUI 内置源命名,如 AnimatedSettingsVisualSource)。 */
  readonly name: string
  /** SVG 坐标系。 */
  readonly viewBox: string
  /** 部件过渡速度档,缺省 'normal'。 */
  readonly transitionSpeed?: AnimatedIconTransitionSpeed
  /** SVG 部件(渲染顺序即文档顺序)。 */
  readonly parts: readonly AnimatedIconSourcePart[]
}

/**
 * 源运行时上下文:AnimatedIcon 渲染源时提供的状态快照。
 * progress(0–1)对应 WinUI IAnimatedVisualSource2.SetProgress 的播放进度;
 * CSS 源以 transition 自行推进、不消费 progress,控件仅将其写入根元素 CSS 变量
 * `--wui-animatedicon-progress` 预留(供未来 Lottie 源 / calc 型 CSS 源使用)。
 */
export interface AnimatedIconSourceContext {
  readonly state: AnimatedIconState
  /** 播放进度 0–1;CSS 源恒为 0(由过渡自行推进)。 */
  readonly progress: number
}

/** FallbackIconSource(WinUI IconSource 的 Web 简化):图标字体字形 / 内联 SVG。 */
export type AnimatedIconFallbackSource =
  | { readonly type: 'font'; readonly glyph: string; readonly fontSize?: number | string }
  | { readonly type: 'svg'; readonly markup: string; readonly viewBox?: string }

/** 解析部件在某状态下的目标样式;未声明回落 Normal。 */
export function resolvePartState(
  part: AnimatedIconSourcePart,
  state: AnimatedIconState,
): AnimatedIconPartState {
  return part.states[state] ?? part.states.Normal ?? {}
}

/* ======================================================================
 * 内置演示源(CSS/SVG 驱动,简化复刻 WinUI 内置源的状态行为)
 * ====================================================================== */

/**
 * 下拉 chevron 双态翻面(Expander / ComboBox / DropDownButton 下拉箭头)。
 * 对照 CK/WinUI-Reference/controls/dev/AnimatedIcon/AnimatedVisuals/
 * AnimatedChevronUpDownSmallVisualSource.cpp:progress 绑定旋转 0→180°,
 * 18 段 Normal、PointerOver、Pressed 与 On、Off 组合 marker;Web 以悬停翻面 + 按压缩放近似,速度取 fast 档。
 */
export const AnimatedChevronUpDownSmallVisualSource: AnimatedIconSource = {
  kind: 'css-svg',
  name: 'AnimatedChevronUpDownSmallVisualSource',
  viewBox: '0 0 16 16',
  transitionSpeed: 'fast',
  parts: [
    {
      name: 'root',
      svg:
        '<path d="M4.2 5.6 8 9.4l3.8-3.8" fill="none" stroke="currentColor" ' +
        'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
      states: {
        PointerOver: { transform: 'rotate(180deg)' },
        Pressed: { transform: 'rotate(180deg) scale(0.82)' },
      },
    },
  ],
}

/**
 * 设置齿轮(官方示例 2 的 GameSettingsIcon 同款源)。
 * 对照 AnimatedSettingsVisualSource.cpp:progress 绑定 RotationAngleInDegrees
 * 0→360 / 0→-20 多段旋转 + IsVisible 齿闪烁;Web 简化为 8 齿 + 圆环:
 * 悬停转过 120°、按压整转 360°,速度取 slow 档(源为多段 marker 时间线,未逐段换算)。
 */
export const AnimatedSettingsVisualSource: AnimatedIconSource = {
  kind: 'css-svg',
  name: 'AnimatedSettingsVisualSource',
  viewBox: '0 0 16 16',
  transitionSpeed: 'slow',
  parts: [
    {
      name: 'gear',
      svg:
        '<circle cx="8" cy="8" r="4.25" fill="none" stroke="currentColor" stroke-width="2.25"/>' +
        [0, 45, 90, 135, 180, 225, 270, 315]
          .map(
            (angle) =>
              `<rect x="7.25" y="1.25" width="1.5" height="3" rx="0.75" fill="currentColor" transform="rotate(${angle} 8 8)"/>`,
          )
          .join(''),
      states: {
        PointerOver: { transform: 'rotate(120deg)' },
        Pressed: { transform: 'rotate(360deg)' },
      },
    },
  ],
}

/**
 * 播放 / 暂停两形切换(WinUI MediaTransportControls 的 AnimatedPlayPauseVisualSource;
 * 本仓库 CK 参照未含该源文件,按 WinUI 公开行为复刻):悬停在播放三角与暂停双条之间
 * 以 opacity + scale 交叉过渡切换,按压整体收缩反馈,速度取 normal 档。
 */
export const AnimatedPlayPauseVisualSource: AnimatedIconSource = {
  kind: 'css-svg',
  name: 'AnimatedPlayPauseVisualSource',
  viewBox: '0 0 16 16',
  transitionSpeed: 'normal',
  parts: [
    {
      name: 'play',
      svg:
        '<path d="M5.2 3.6v8.8a.7.7 0 0 0 1.06.6l7.04-4.4a.7.7 0 0 0 0-1.2L6.26 3a.7.7 0 0 0-1.06.6Z" ' +
        'fill="currentColor"/>',
      states: {
        Normal: { opacity: 1, transform: 'scale(1)' },
        PointerOver: { opacity: 0, transform: 'scale(0.5)' },
        Pressed: { opacity: 0, transform: 'scale(0.4)' },
      },
    },
    {
      name: 'pause',
      svg:
        '<rect x="4.4" y="3.5" width="2.4" height="9" rx="1" fill="currentColor"/>' +
        '<rect x="9.2" y="3.5" width="2.4" height="9" rx="1" fill="currentColor"/>',
      states: {
        Normal: { opacity: 0, transform: 'scale(1.5)' },
        PointerOver: { opacity: 1, transform: 'scale(1)' },
        Pressed: { opacity: 1, transform: 'scale(0.85)' },
      },
    },
  ],
}

/** 内置演示源清单(demo 页 Kind 下拉与降级对照的数据源)。 */
export const ANIMATED_ICON_BUILTIN_SOURCES: readonly AnimatedIconSource[] = [
  AnimatedChevronUpDownSmallVisualSource,
  AnimatedSettingsVisualSource,
  AnimatedPlayPauseVisualSource,
]

/** 按源名取内置源(demo 页下拉绑定用);未知名称返回 undefined。 */
export function findBuiltinSource(name: string): AnimatedIconSource | undefined {
  return ANIMATED_ICON_BUILTIN_SOURCES.find((source) => source.name === name)
}
