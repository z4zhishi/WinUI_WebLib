// WinUI_WebLib — WinUI 缓动函数族纯函数工具(easingFunctions.ts)
//
// WinUI 的缓动函数(microsoft.ui.xaml.media.animation 命名空间下的 *Ease 类族)以
// EasingFunctionBase.Ease(t) 把动画归一化时间 t ∈ [0,1] 映射为进度,配合 EasingMode
// (EaseIn / EaseOut / EaseInOut)控制速度曲线形态。本文件把整族曲线移植为纯函数:
//
//   easingProgress(kind, mode, t, params?) —— t ∈ [0,1] → 进度(可超出 [0,1]:
//   Back 回撤/过冲、Elastic 振荡为 WinUI 本义,调用方自行决定是否夹取)。
//
// 参照源(只读;公式、默认值、钳制行为全部逐行对照,非 Penner 社区版转抄):
//   - CK/WinUI-Reference/dxaml/xcp/components/animation/EasingFunctions.cpp
//     —— 各族 EaseInCore 实现 + CEasingFunctionImpl::Ease 的模式包装(EaseOut =
//     1 − EaseInCore(1−t);EaseInOut 在 t<0.5 时取 EaseInCore(2t)/2,否则
//     (1 − EaseInCore(2−2t))/2 + 0.5);
//   - CK/WinUI-Reference/dxaml/xcp/core/inc/EasingFunctions.h
//     —— 默认值与钳制:BackEase.Amplitude=1、BounceEase.Bounces=3(整型)、
//     BounceEase.Bounciness=2(≤1+ε 时钳为 1.01)、ElasticEase.Oscillations=3
//     (负值钳 0)、ElasticEase.Springiness=3、ExponentialEase.Exponent=2、
//     PowerEase.Power=2;默认 EasingMode 为 EaseOut;
//   - CK/WinUI-Reference/dxaml/test/managed/animation/EasingFunctionBaseTests/*.cs
//     —— 集成测试 ground truth(如 BounceEase 默认 easeIn(0.25)=0.109375、
//     BackEase 默认 easeIn(0.5)=−0.375)已用本实现逐点核对(容差 1e−6,参照源
//     为 float32、本文件为 double,存在 ≤1e−6 量级噪声);
//   - CK/WinUI-Gallery/WinUIGallery/Samples/EasingFunction/(官方示例:11 个命名
//     缓动类;Standard=CircleEase EaseInOut、Accelerate=ExponentialEase EaseIn
//     Exponent 4.5、Decelerate=ExponentialEase EaseOut Exponent 7)。
//
// 与 WinUI 的已知差异(详见 wiki/controls/EasingFunction.md):
//   1. 参照源 EaseInCore 以 float32(XFLOAT)计算,本文件用 double —— 数值差 ≤1e−6;
//   2. WinUI 无 LinearEase 类(参照源与官方示例均无):列表中的 'linear' 为恒等
//      基准项(t → t),便于与 CSS linear 对照,已在条目上注明;
//   3. Bounces / Oscillations 在 WinUI 为整型属性,本文件对传入值向下取整;
//   4. CSS cubic-bezier 仅能表达单调曲线(单段三次贝塞尔):幂族(Linear/Power/
//      Quadratic/Cubic)的 EaseIn/EaseOut 可给出数学上精确的 bezier 映射,其余单调
//      族给出社区通行近似值,Back/Bounce/Elastic(非单调/多次振荡)无 bezier 表示,
//      cssEasing 返回 null —— 需用本文件的 JS 公式逐帧驱动。

/** 缓动模式(对应 WinUI EasingMode;参照源默认 EaseOut)。 */
export type EasingMode = 'easeIn' | 'easeOut' | 'easeInOut'

/**
 * 缓动函数族名(WinUI 类名去 Ease 后缀的小驼峰)。
 * 全部 11 个 WinUI 缓动类 + 'linear' 恒等基准(WinUI 无 LinearEase,见文件头注 2)。
 */
export type EasingFunctionKind =
  | 'back'
  | 'bounce'
  | 'circle'
  | 'cubic'
  | 'elastic'
  | 'exponential'
  | 'linear'
  | 'power'
  | 'quadratic'
  | 'quartic'
  | 'quintic'
  | 'sine'

/** 各族可调参数(WinUI 属性名 → 小驼峰;仅对应族读取自己的键,其余忽略)。 */
export interface EasingParams {
  /** BackEase.Amplitude(默认 1)。 */
  amplitude?: number
  /** BounceEase.Bounces(整型,默认 3)。 */
  bounces?: number
  /** BounceEase.Bounciness(默认 2;≤1 时参照源钳为 1.01)。 */
  bounciness?: number
  /** ExponentialEase.Exponent(默认 2;≈0 时退化为线性)。 */
  exponent?: number
  /** ElasticEase.Oscillations(整型,默认 3;负值钳 0)。 */
  oscillations?: number
  /** ElasticEase.Springiness(默认 3;≈0 时包络退化为线性)。 */
  springiness?: number
  /** PowerEase.Power(默认 2;参照源取 max(Power, 0),Power=0 时 t⁰ 恒 1)。 */
  power?: number
}

/** 单个可调参数的元数据(demo 滑块与 wiki 表共用)。 */
export interface EasingParamDef {
  /** 参数键(EasingParams 的键)。 */
  key: keyof EasingParams
  /** WinUI 属性全名(类名.属性名)。 */
  winuiName: string
  /** 中文标签。 */
  labelZh: string
  /** demo 滑块最小值(非 WinUI 限制,演示用范围)。 */
  min: number
  /** demo 滑块最大值。 */
  max: number
  /** 滑块步长。 */
  step: number
  /** WinUI 默认值(参照源 EasingFunctions.h)。 */
  defaultValue: number
  /** 说明。 */
  description: string
}

/**
 * CSS cubic-bezier 关系:该族(默认参数)曲线与 CSS 缓动的对应程度。
 * - exact:存在数学上精确的 cubic-bezier / linear 映射;
 * - approximate:曲线单调、可用 cubic-bezier 近似(社区通行对照值);
 * - none:非单调(回撤 / 弹跳 / 振荡),cubic-bezier 不可表达,须用 JS 公式。
 */
export type CssEasingRelation = 'exact' | 'approximate' | 'none'

/** 单个缓动函数族的定义。 */
export interface EasingFunctionDef {
  /** 族名。 */
  kind: EasingFunctionKind
  /** WinUI 类名;'linear' 恒等基准无对应类,为 null。 */
  winuiName: string | null
  /** 中文名。 */
  labelZh: string
  /** 一句话说明(依 WinUI 文档语义)。 */
  description: string
  /** EaseInCore 公式(纯文本;模式包装见 easeWithMode)。 */
  formula: string
  /** 可调参数元数据(无参数的族为空数组)。 */
  params: EasingParamDef[]
  /** CSS cubic-bezier 关系(以默认参数曲线为准)。 */
  cssRelation: CssEasingRelation
  /** 三模式的 CSS easing 值;null = 无 cubic-bezier 表示,须用 JS 公式驱动。 */
  cssEasing: Record<EasingMode, string | null>
  /**
   * EaseIn 核心:f(t),t∈[0,1],f(0)=0、f(1)=1(逐行对照 EasingFunctions.cpp)。
   * 参数取 params 中该族的键,缺省用 WinUI 默认值。
   */
  easeInCore: (t: number, params: EasingParams) => number
}

/** 参照源 FLOAT_EPSILON(0.0001):Exponent / Springiness 的「≈0」判定与 Bounciness 钳制阈值。 */
export const EASING_FLOAT_EPSILON = 0.0001

/** 三种缓动模式(展示顺序即 WinUI 文档顺序)。 */
export const EASING_MODES: readonly EasingMode[] = ['easeIn', 'easeOut', 'easeInOut']

/** —— 各族 EaseInCore(逐行对照 EasingFunctions.cpp)—— */

function easeInCoreBack(t: number, params: EasingParams): number {
  // CBackInterpolator::EaseInCore:负时间钳 0;f(t) = t³ − t·Amplitude·sin(πt)
  if (t < 0) {
    t = 0
  }
  const amplitude = params.amplitude ?? 1
  return t * t * t - t * amplitude * Math.sin(t * Math.PI)
}

function easeInCoreBounce(t: number, params: EasingParams): number {
  // CBounceInterpolator::EaseInCore:几何级数分段抛物线(闭式,无循环)。
  const rawBounces = params.bounces ?? 3
  const bounces = rawBounces >= 0 ? Math.floor(rawBounces) : 0
  const rawBounciness = params.bounciness ?? 2
  const bounciness = rawBounciness <= 1 + EASING_FLOAT_EPSILON ? 1.01 : rawBounciness

  const pow = Math.pow(bounciness, bounces)
  const oneMinusBounciness = 1 - bounciness

  // 'unit' 空间:几何级数(最后一段只算一半)
  const sumOfUnits = (1 - pow) / oneMinusBounciness + pow / 2
  const unitAtT = t * sumOfUnits

  // 'bounce' 空间:当前处于第几个半抛物线
  const bounceAtT = Math.log(-unitAtT * oneMinusBounciness + 1) / Math.log(bounciness)
  const start = Math.floor(bounceAtT)
  const end = start + 1

  // 'time' 空间:该段的起止时间
  const startTime = (1 - Math.pow(bounciness, start)) / (oneMinusBounciness * sumOfUnits)
  const endTime = (1 - Math.pow(bounciness, end)) / (oneMinusBounciness * sumOfUnits)

  // 抛物线拟合:过 (startTime, 0)、(endTime, 0),峰值 amplitude 在中点
  const midTime = (startTime + endTime) / 2
  const timeRelativeToPeak = t - midTime
  const radius = midTime - startTime
  const amplitude = Math.pow(1 / bounciness, bounces - start)
  return ((-amplitude / (radius * radius)) * (timeRelativeToPeak - radius) * (timeRelativeToPeak + radius))
}

function easeInCoreCircle(t: number): number {
  // CCircInterpolator::EaseInCore:输入钳 [−1,1];f(t) = 1 − √(1 − t²)
  if (t < -1) {
    t = -1
  }
  if (t > 1) {
    t = 1
  }
  return 1 - Math.sqrt(1 - t * t)
}

function easeInCoreElastic(t: number, params: EasingParams): number {
  // CElasticInterpolator::EaseInCore:指数包络 × 正弦
  const rawOscillations = params.oscillations ?? 3
  const oscillations = rawOscillations >= 0 ? Math.floor(rawOscillations) : 0
  const springiness = params.springiness ?? 3
  const exponentialModifier =
    springiness >= -EASING_FLOAT_EPSILON && springiness <= EASING_FLOAT_EPSILON
      ? t
      : (Math.exp(springiness * t) - 1) / (Math.exp(springiness) - 1)
  return exponentialModifier * Math.sin(t * (2 * Math.PI * oscillations + Math.PI / 2))
}

function easeInCoreExponential(t: number, params: EasingParams): number {
  // CExponentialInterpolator::EaseInCore:Exponent≈0 时为线性
  const exponent = params.exponent ?? 2
  if (exponent >= -EASING_FLOAT_EPSILON && exponent <= EASING_FLOAT_EPSILON) {
    return t
  }
  return (Math.exp(exponent * t) - 1) / (Math.exp(exponent) - 1)
}

function easeInCorePower(t: number, params: EasingParams): number {
  // CPowerInterpolator::EaseInCore:f(t) = t^max(Power, 0)(Power=0 时 t⁰ 恒 1,与 C powf 一致)
  return Math.pow(t, Math.max(params.power ?? 2, 0))
}

function easeInCoreSine(t: number): number {
  // CSineInterpolator::EaseInCore:f(t) = 1 − sin((1−t)·π/2) ≡ 1 − cos(πt/2)
  return 1 - Math.sin((1 - t) * (Math.PI / 2))
}

/** —— 族定义表(顺序按字母,与官方示例 ComboBox 一致;'linear' 为补充基准项)—— */

export const EASING_FUNCTIONS: readonly EasingFunctionDef[] = [
  {
    kind: 'back',
    winuiName: 'BackEase',
    labelZh: '回撤',
    description: '运动先向反方向回撤再前进(EaseIn)/ 冲过目标再回弹(EaseOut),幅度由 Amplitude 控制。',
    formula: 'f(t) = t³ − t·Amplitude·sin(πt)(t < 0 钳为 0)',
    params: [
      {
        key: 'amplitude',
        winuiName: 'BackEase.Amplitude',
        labelZh: '幅度',
        min: 0,
        max: 5,
        step: 0.1,
        defaultValue: 1,
        description: '回撤/过冲幅度;参照源默认 1(WinUI 允许负值,演示滑块限定 ≥0)',
      },
    ],
    cssRelation: 'none',
    cssEasing: { easeIn: null, easeOut: null, easeInOut: null },
    easeInCore: easeInCoreBack,
  },
  {
    kind: 'bounce',
    winuiName: 'BounceEase',
    labelZh: '弹跳',
    description: '落地弹跳:EaseOut 如球抵达目标后逐次衰减弹跳,EaseIn 先弹跳蓄力再出发。',
    formula: '几何级数分段抛物线(闭式实现见 EasingFunctions.cpp CBounceInterpolator::EaseInCore;Bounces 为弹跳段数,Bounciness 为相邻弹跳的幅度/时长比)',
    params: [
      {
        key: 'bounces',
        winuiName: 'BounceEase.Bounces',
        labelZh: '弹跳次数',
        min: 0,
        max: 8,
        step: 1,
        defaultValue: 3,
        description: '弹跳段数(整型);参照源默认 3,负值钳为 0',
      },
      {
        key: 'bounciness',
        winuiName: 'BounceEase.Bounciness',
        labelZh: '弹性',
        min: 1.1,
        max: 5,
        step: 0.1,
        defaultValue: 2,
        description: '每次弹跳幅度与时长衰减为 1/Bounciness;≤1 时参照源钳为 1.01(演示滑块从 1.1 起)',
      },
    ],
    cssRelation: 'none',
    cssEasing: { easeIn: null, easeOut: null, easeInOut: null },
    easeInCore: easeInCoreBounce,
  },
  {
    kind: 'circle',
    winuiName: 'CircleEase',
    labelZh: '圆弧',
    description: '四分之一圆弧插值,加/减速比幂函数更陡;官方 Standard 示例即 CircleEase EaseInOut。',
    formula: 'f(t) = 1 − √(1 − t²)(t 钳到 [−1, 1])',
    params: [],
    cssRelation: 'approximate',
    cssEasing: {
      easeIn: 'cubic-bezier(0.55, 0, 1, 0.45)',
      easeOut: 'cubic-bezier(0, 0.55, 0.45, 1)',
      easeInOut: 'cubic-bezier(0.85, 0, 0.15, 1)',
    },
    easeInCore: (t) => easeInCoreCircle(t),
  },
  {
    kind: 'cubic',
    winuiName: 'CubicEase',
    labelZh: '三次幂',
    description: '三次幂曲线;EaseIn/EaseOut 有精确 cubic-bezier 映射。',
    formula: 'f(t) = t³',
    params: [],
    cssRelation: 'exact',
    cssEasing: {
      easeIn: 'cubic-bezier(0.33333, 0, 0.66667, 0)',
      easeOut: 'cubic-bezier(0.33333, 1, 0.66667, 1)',
      easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    },
    easeInCore: (t) => t * t * t,
  },
  {
    kind: 'elastic',
    winuiName: 'ElasticEase',
    labelZh: '弹性',
    description: '弹簧振荡:包络按指数增长/衰减,振幅由 Oscillations × Springiness 共同塑形。',
    formula: 'f(t) = ((e^(Springiness·t) − 1)/(e^Springiness − 1))·sin(t·(2π·Oscillations + π/2))(Springiness≈0 时包络为 t)',
    params: [
      {
        key: 'oscillations',
        winuiName: 'ElasticEase.Oscillations',
        labelZh: '振荡次数',
        min: 0,
        max: 8,
        step: 1,
        defaultValue: 3,
        description: '目标往复振荡次数(整型);参照源默认 3,负值钳为 0',
      },
      {
        key: 'springiness',
        winuiName: 'ElasticEase.Springiness',
        labelZh: '弹簧刚度',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 3,
        description: '弹簧刚度:越大包络越陡;≈0 时包络退化为线性 t',
      },
    ],
    cssRelation: 'none',
    cssEasing: { easeIn: null, easeOut: null, easeInOut: null },
    easeInCore: easeInCoreElastic,
  },
  {
    kind: 'exponential',
    winuiName: 'ExponentialEase',
    labelZh: '指数',
    description: '指数曲线;官方 Accelerate / Decelerate 示例即 ExponentialEase(EaseIn Exponent 4.5 / EaseOut Exponent 7)。',
    formula: 'f(t) = (e^(Exponent·t) − 1)/(e^Exponent − 1)(Exponent≈0 时为 t)',
    params: [
      {
        key: 'exponent',
        winuiName: 'ExponentialEase.Exponent',
        labelZh: '指数',
        min: 0,
        max: 10,
        step: 0.1,
        defaultValue: 2,
        description: '指数;≈0(|Exponent| ≤ 0.0001)时退化为线性 t',
      },
    ],
    cssRelation: 'approximate',
    cssEasing: {
      easeIn: 'cubic-bezier(0.7, 0, 0.84, 0)',
      easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
      easeInOut: 'cubic-bezier(0.87, 0, 0.13, 1)',
    },
    easeInCore: easeInCoreExponential,
  },
  {
    kind: 'linear',
    winuiName: null,
    labelZh: '线性',
    description: '恒等基准:进度 = 时间(匀速)。WinUI 无 LinearEase 类,此项为与 CSS linear 对照而设。',
    formula: 'f(t) = t',
    params: [],
    cssRelation: 'exact',
    cssEasing: { easeIn: 'linear', easeOut: 'linear', easeInOut: 'linear' },
    easeInCore: (t) => t,
  },
  {
    kind: 'power',
    winuiName: 'PowerEase',
    labelZh: '幂(可调)',
    description: '幂函数 t^Power;默认 Power=2 与 QuadraticEase 重合,调大幂次曲线更陡。',
    formula: 'f(t) = t^max(Power, 0)(Power=0 时 t⁰ 恒 1,与参照源 powf 行为一致)',
    params: [
      {
        key: 'power',
        winuiName: 'PowerEase.Power',
        labelZh: '幂次',
        min: 0.1,
        max: 10,
        step: 0.1,
        defaultValue: 2,
        description: '幂次;参照源默认 2(=QuadraticEase),取 max(Power, 0);演示滑块从 0.1 起避开恒 1 退化',
      },
    ],
    cssRelation: 'exact',
    cssEasing: {
      // Power=2(默认)时曲线与 Quadratic 相同 → In/Out 的精确映射随参数失效,按「默认参数曲线」口径标 exact
      easeIn: 'cubic-bezier(0.33333, 0, 0.66667, 0.33333)',
      easeOut: 'cubic-bezier(0.33333, 0.66667, 0.66667, 1)',
      easeInOut: 'cubic-bezier(0.45, 0, 0.55, 1)',
    },
    easeInCore: easeInCorePower,
  },
  {
    kind: 'quadratic',
    winuiName: 'QuadraticEase',
    labelZh: '二次幂',
    description: '二次幂曲线;EaseIn/EaseOut 有精确 cubic-bezier 映射。',
    formula: 'f(t) = t²',
    params: [],
    cssRelation: 'exact',
    cssEasing: {
      easeIn: 'cubic-bezier(0.33333, 0, 0.66667, 0.33333)',
      easeOut: 'cubic-bezier(0.33333, 0.66667, 0.66667, 1)',
      easeInOut: 'cubic-bezier(0.45, 0, 0.55, 1)',
    },
    easeInCore: (t) => t * t,
  },
  {
    kind: 'quartic',
    winuiName: 'QuarticEase',
    labelZh: '四次幂',
    description: '四次幂曲线;单一 cubic-bezier(三次)无法精确表示四次多项式,提供近似映射。',
    formula: 'f(t) = t⁴',
    params: [],
    cssRelation: 'approximate',
    cssEasing: {
      easeIn: 'cubic-bezier(0.5, 0, 0.75, 0)',
      easeOut: 'cubic-bezier(0.25, 1, 0.5, 1)',
      easeInOut: 'cubic-bezier(0.76, 0, 0.24, 1)',
    },
    easeInCore: (t) => t * t * t * t,
  },
  {
    kind: 'quintic',
    winuiName: 'QuinticEase',
    labelZh: '五次幂',
    description: '五次幂曲线;加/减速最陡的幂族成员,提供近似映射。',
    formula: 'f(t) = t⁵',
    params: [],
    cssRelation: 'approximate',
    cssEasing: {
      easeIn: 'cubic-bezier(0.64, 0, 0.78, 0)',
      easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
      easeInOut: 'cubic-bezier(0.83, 0, 0.17, 1)',
    },
    easeInCore: (t) => t * t * t * t * t,
  },
  {
    kind: 'sine',
    winuiName: 'SineEase',
    labelZh: '正弦',
    description: '正弦四分之一周期曲线,加/减速平滑温和。',
    formula: 'f(t) = 1 − sin((1 − t)·π/2) ≡ 1 − cos(πt/2)',
    params: [],
    cssRelation: 'approximate',
    cssEasing: {
      easeIn: 'cubic-bezier(0.12, 0, 0.39, 0)',
      easeOut: 'cubic-bezier(0.61, 1, 0.88, 1)',
      easeInOut: 'cubic-bezier(0.37, 0, 0.63, 1)',
    },
    easeInCore: easeInCoreSine,
  },
]

/**
 * 按族名取定义;未知族名直接抛错(编程期错误,不静默回退),同 themeShadow 工具口径。
 */
export function getEasingFunction(kind: EasingFunctionKind): EasingFunctionDef {
  const def = EASING_FUNCTIONS.find((entry) => entry.kind === kind)
  if (!def) {
    const names = EASING_FUNCTIONS.map((entry) => entry.kind).join(' / ')
    throw new Error(`[easingFunctions] 未知缓动族 "${String(kind)}",可用:${names}`)
  }
  return def
}

/**
 * 取某族的 WinUI 默认参数(仅含该族声明的键,值来自 EasingParamDef.defaultValue)。
 */
export function defaultEasingParams(kind: EasingFunctionKind): EasingParams {
  const params: EasingParams = {}
  for (const def of getEasingFunction(kind).params) {
    params[def.key] = def.defaultValue
  }
  return params
}

/**
 * 模式包装 + 单点求值:t ∈ [0,1](域外按公式外推)→ 进度。
 * 逐行对照 CEasingFunctionImpl::Ease(EasingFunctions.cpp):
 *   easeIn    = EaseInCore(t)
 *   easeOut   = 1 − EaseInCore(1 − t)
 *   easeInOut = t < 0.5 ? EaseInCore(2t)/2 : (1 − EaseInCore(2 − 2t))/2 + 0.5
 */
export function easingProgress(
  kind: EasingFunctionKind,
  mode: EasingMode,
  t: number,
  params: EasingParams = {},
): number {
  const core = getEasingFunction(kind).easeInCore
  switch (mode) {
    case 'easeIn':
      return core(t, params)
    case 'easeOut':
      return 1 - core(1 - t, params)
    case 'easeInOut':
      return t < 0.5 ? core(t * 2, params) / 2 : (1 - core(2 - t * 2, params)) / 2 + 0.5
  }
}

/**
 * 采样:samples 段均匀切分 [0,1](含两端,返回 samples + 1 个进度值),
 * 供绘制进度曲线(SVG path / canvas 折线)直接使用。
 */
export function sampleEasingProgress(
  kind: EasingFunctionKind,
  mode: EasingMode,
  samples: number,
  params: EasingParams = {},
): number[] {
  const count = Math.max(1, Math.floor(samples))
  const values: number[] = []
  for (let i = 0; i <= count; i += 1) {
    values.push(easingProgress(kind, mode, i / count, params))
  }
  return values
}
