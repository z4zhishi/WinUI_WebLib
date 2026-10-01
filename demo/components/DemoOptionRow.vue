<script setup lang="ts">
// 单个参数行:label + 库内 Wui 控件(slider/toggle/select/text/number),v-model 双向绑定。
// FIX23(构成检查):控件一律用 src/components/ 的 Wui 组件(DOM 类名 wui-*),
// 不再使用原生 input/select/手搓开关;本组件负责联合值(string | number | boolean,
// 契约见 demo/components/README.md)与 Wui 组件强类型模型之间的换算,父级用法不变。
import { computed } from 'vue'
import WuiComboBox from '@/components/ComboBox.vue'
import WuiSlider from '@/components/Slider.vue'
import WuiTextBox from '@/components/TextBox.vue'
import WuiToggleSwitch from '@/components/ToggleSwitch.vue'

/** 参数行控件类型。 */
type DemoOptionType = 'slider' | 'toggle' | 'select' | 'text' | 'number'

/** select 类型的选项。 */
interface DemoOptionChoice {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    /** 参数名(左侧标签)。 */
    label: string
    /** 控件类型,默认 text。 */
    type?: DemoOptionType
    /** slider/number:最小值。 */
    min?: number
    /** slider/number:最大值。 */
    max?: number
    /** slider/number:步长。 */
    step?: number
    /** select:选项列表。 */
    options?: DemoOptionChoice[]
    /** text/number:占位文本。 */
    placeholder?: string
  }>(),
  {
    type: 'text',
    min: 0,
    max: 100,
    step: 1,
    options: () => [],
    placeholder: '',
  },
)

// v-model:modelValue 取值随 type 约定 —— toggle → boolean,slider/number → number,text/select → string。
// 因此约定父级参数 ref 声明为 string | number | boolean 联合类型(见 demo/components/README.md)。
const model = defineModel<string | number | boolean>()

// —— 联合值的归一化读取(Wui 组件模型为强类型,在此换算)——
const numberValue = computed<number>(() => {
  const parsed = Number(model.value)
  return Number.isFinite(parsed) ? parsed : props.min
})

const stringValue = computed<string>(() => {
  const value = model.value
  if (value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
})

const checkedValue = computed<boolean>(() => model.value === true)

// —— 各 Wui 组件的双向模型(update:* → 联合值写回,带类型收窄)——

/** WuiSlider(v-model:value)。 */
const sliderModel = computed<number>({
  get: () => numberValue.value,
  set: (value) => {
    model.value = value
  },
})

/** WuiToggleSwitch(v-model:is-on)。 */
const switchModel = computed<boolean>({
  get: () => checkedValue.value,
  set: (value) => {
    model.value = value
  },
})

/** WuiTextBox(v-model:text;text/number 共用)。number 类型:输入中途(空串/未完好的
    数字)暂存原始串,由父级 Number() 归一,保证输入流畅。 */
const textModel = computed<string>({
  get: () => stringValue.value,
  set: (raw) => {
    if (props.type !== 'number') {
      model.value = raw
      return
    }
    const parsed = Number(raw)
    model.value = raw.trim() !== '' && Number.isFinite(parsed) ? parsed : raw
  },
})

/** WuiComboBox(v-model:selected-item):选项即 label 字符串,label ↔ choice.value 换算;
    模型类型对齐组件的 unknown 模型,写回前收窄为 string。 */
const choiceLabels = computed<string[]>(() => props.options.map((choice) => choice.label))

const selectModel = computed<unknown>({
  get: () => props.options.find((choice) => choice.value === stringValue.value)?.label ?? '',
  set: (value) => {
    if (typeof value !== 'string') return
    const choice = props.options.find((candidate) => candidate.label === value)
    if (choice) model.value = choice.value
  },
})
</script>

<template>
  <div class="option-row">
    <span class="option-label">{{ label }}</span>
    <div class="option-control">
      <WuiSlider
        v-if="type === 'slider'"
        v-model:value="sliderModel"
        class="option-slider"
        :minimum="min"
        :maximum="max"
        :step-frequency="step"
        :aria-label="label"
      />
      <WuiToggleSwitch
        v-else-if="type === 'toggle'"
        v-model:is-on="switchModel"
        class="option-switch"
        on-content=""
        off-content=""
        :aria-label="label"
      />
      <WuiComboBox
        v-else-if="type === 'select'"
        v-model:selected-item="selectModel"
        class="option-select"
        :items="choiceLabels"
        :aria-label="label"
      />
      <WuiTextBox
        v-else-if="type === 'number'"
        v-model:text="textModel"
        class="option-input"
        :placeholder-text="placeholder"
        :aria-label="label"
      />
      <WuiTextBox
        v-else
        v-model:text="textModel"
        class="option-input"
        :placeholder-text="placeholder"
        :aria-label="label"
      />
    </div>
  </div>
</template>

<style scoped>
/* WinUI 设置项卡片观感:单行卡片 + 左标签右控件 */
.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 48px;
  padding: 8px 12px;
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.option-label {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.option-control {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

/* —— 尺寸约束:只调容器级宽高(选择器带父级限定,稳定压过组件根的 width/min-width 声明),
      不触碰组件内部结构与状态样式;行高与控件自身 32px 高度规格一致,不暴涨 —— */

/* slider:固定 180px(组件根默认 width:100%,需父级限定覆盖) */
.option-control .option-slider {
  width: 180px;
}

/* select / text / number:与原参数面板一致的行内紧凑宽度 */
.option-control .option-select,
.option-control .option-input {
  width: 200px;
  min-width: 160px;
  max-width: 240px;
}

@media (max-width: 720px) {
  .option-row {
    flex-direction: column;
    align-items: stretch;
  }

  .option-control {
    justify-content: flex-start;
  }

  .option-control .option-slider {
    width: 100%;
  }

  .option-control .option-select,
  .option-control .option-input {
    width: 100%;
    min-width: 0;
    max-width: none;
  }
}
</style>
