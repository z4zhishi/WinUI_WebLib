<script setup lang="ts">
// 单个参数行:label + 原生控件(slider/toggle/select/text/number),v-model 双向绑定。
// 样式用 --wui-* token 做成 WinUI 观感(开关为纯 CSS 复刻 WinUI ToggleSwitch)。
import { computed, useId } from 'vue'

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

const controlId = useId()

// —— 各控件类型对联合值的归一化读取 ——
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

// —— 写回(带类型收窄)——
function onCheckedChange(event: Event): void {
  model.value = (event.target as HTMLInputElement).checked
}

function onNumberInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  const parsed = Number(raw)
  // 输入中途(空串/未完好的数字)暂存原始串,由父级 Number() 归一,保证输入流畅。
  model.value = raw.trim() !== '' && Number.isFinite(parsed) ? parsed : raw
}

function onSelectChange(event: Event): void {
  model.value = (event.target as HTMLSelectElement).value
}

function onTextInput(event: Event): void {
  model.value = (event.target as HTMLInputElement).value
}
</script>

<template>
  <div class="option-row">
    <label class="option-label" :for="controlId">{{ label }}</label>
    <div class="option-control">
      <input
        v-if="type === 'slider'"
        :id="controlId"
        class="option-slider"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="numberValue"
        @input="onNumberInput"
      />
      <label v-else-if="type === 'toggle'" class="switch" :for="controlId">
        <input
          :id="controlId"
          class="switch-input"
          type="checkbox"
          :checked="checkedValue"
          @change="onCheckedChange"
        />
        <span class="switch-track" aria-hidden="true"></span>
      </label>
      <select
        v-else-if="type === 'select'"
        :id="controlId"
        class="option-select"
        :value="stringValue"
        @change="onSelectChange"
      >
        <option v-for="choice in options" :key="choice.value" :value="choice.value">
          {{ choice.label }}
        </option>
      </select>
      <input
        v-else-if="type === 'number'"
        :id="controlId"
        class="option-input"
        type="number"
        :min="min"
        :max="max"
        :step="step"
        :placeholder="placeholder"
        :value="numberValue"
        @input="onNumberInput"
      />
      <input
        v-else
        :id="controlId"
        class="option-input"
        type="text"
        :placeholder="placeholder"
        :value="stringValue"
        @input="onTextInput"
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

/* —— slider:accent-color 直接取 WinUI 滑轨填充 token —— */
.option-slider {
  width: 180px;
  accent-color: var(--wui-slider-track-decrease-background-theme);
}

.option-slider:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

/* —— toggle:复刻 WinUI ToggleSwitch —— */
.switch {
  position: relative;
  display: inline-flex;
  cursor: pointer;
}

.switch-input {
  position: absolute;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

/* 轨道胶囊:999px 为开关结构尺寸(全圆角),非主题圆角;主题圆角 token 仅 4px */
.switch-track {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
  border-radius: 999px;
  background: var(--wui-toggle-switch-track-background-theme);
  border: 1px solid var(--wui-toggle-switch-outer-border-border-theme);
  transition:
    background 0.1s ease,
    border-color 0.1s ease;
}

.switch-track::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--wui-toggle-switch-thumb-background-theme);
  transform: translateY(-50%);
  transition:
    transform 0.1s ease,
    background 0.1s ease;
}

.switch-input:checked + .switch-track {
  background: var(--wui-toggle-switch-curtain-background-theme);
  border-color: var(--wui-toggle-switch-curtain-background-theme);
}

.switch-input:checked + .switch-track::after {
  transform: translate(20px, -50%);
  background: var(--wui-system-control-foreground-alt-high);
}

.switch-input:focus-visible + .switch-track {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 2px;
}

/* —— select / text / number —— */
.option-select,
.option-input {
  min-width: 160px;
  max-width: 240px;
  padding: 4px 8px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.option-select {
  cursor: pointer;
}

.option-select:focus-visible,
.option-input:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.option-input::placeholder {
  color: var(--wui-system-control-foreground-chrome-gray);
}

@media (max-width: 720px) {
  .option-row {
    flex-direction: column;
    align-items: stretch;
  }

  .option-control {
    justify-content: flex-start;
  }

  .option-slider {
    width: 100%;
  }

  .option-select,
  .option-input {
    min-width: 0;
    max-width: none;
  }
}
</style>
