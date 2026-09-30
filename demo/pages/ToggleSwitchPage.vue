<script setup lang="ts">
// ToggleSwitchPage.vue —— ToggleSwitch 控件示例页(结构照抄 HomePage 母版)。
// 参数组合参照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/ToggleSwitch/:
//   Simple(默认 On/Off 文案)+ Custom(Header/OnContent/OffContent + 随 IsOn 联动的状态展示),
//   另补充 Disabled 禁用态演示。
import { computed, ref } from 'vue'
import WuiToggleSwitch from '@/components/ToggleSwitch.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— 可调参数(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
const header = ref<string | number | boolean>('Toggle work')
const onContent = ref<string | number | boolean>('Working')
const offContent = ref<string | number | boolean>('Do work')
const isOn = ref<string | number | boolean>(true)
const disabled = ref<string | number | boolean>(false)

const headerText = computed(() => String(header.value))
const onContentText = computed(() => String(onContent.value))
const offContentText = computed(() => String(offContent.value))
const disabledValue = computed(() => disabled.value === true)

// 开关 ↔ 参数面板双向联动(v-model 需要可写 computed)。
const customIsOn = computed({
  get: () => isOn.value === true,
  set: (value: boolean) => {
    isOn.value = value
  },
})

// —— 简单开关与实时状态(官方示例以 ProgressRing 绑定 IsOn,此处用状态点 + 计数等价呈现)——
const simpleOn = ref(false)
const toggledCount = ref(0)

function onToggled(): void {
  toggledCount.value += 1
}

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['Header', 'string', '开关标头文本,为空时不渲染(文本框实时调节)'],
  ['OnContent', 'string', '开启时显示的槽内容,默认 "On"(文本框实时调节)'],
  ['OffContent', 'string', '关闭时显示的槽内容,默认 "Off"(文本框实时调节)'],
  ['IsOn', 'boolean(v-model:is-on)', '开关状态,双向绑定(与参数面板开关联动)'],
  ['Disabled', 'boolean', '禁用开关:不可点击 / 拖拽 / 聚焦,呈禁用配色'],
  ['Toggled', '() => void', '用户通过点击 / 键盘 / 拖拽改变开关状态时触发'],
]

// 用法代码随参数实时更新(较长,放 computed,引号规则:外双内单)。
const usageCode = computed(
  () => `<WuiToggleSwitch
  v-model:is-on="isOn"
  header="${headerText.value}"
  on-content="${onContentText.value}"
  off-content="${offContentText.value}"
  :disabled="${disabledValue.value}"
  @toggled="onToggled" />

<!-- 简单形态:默认 On / Off 槽文案 -->
<WuiToggleSwitch v-model:is-on="simpleOn" @toggled="onToggled" />`,
)
</script>

<template>
  <DemoPage wiki="ToggleSwitch"
    title="ToggleSwitch"
    description="在两个互斥选项(如开 / 关)之间切换的开关:选择立即生效,适合带单一标签的设置项。点击整行、按空格 / 回车或水平拖拽滑块均可切换。"
  >
    <template #demo>
      <div class="switch-stage">
        <div class="switch-example">
          <WuiToggleSwitch v-model:is-on="simpleOn" @toggled="onToggled" />
          <p class="switch-example-caption">简单形态(默认 On / Off 文案)</p>
        </div>

        <div class="switch-example">
          <WuiToggleSwitch
            v-model:is-on="customIsOn"
            :header="headerText"
            :on-content="onContentText"
            :off-content="offContentText"
            :disabled="disabledValue"
            @toggled="onToggled"
          />
          <p class="switch-state" :class="{ 'switch-state--on': customIsOn }">
            <span class="switch-state-dot" aria-hidden="true"></span>
            IsOn = {{ customIsOn }} · Toggled {{ toggledCount }} 次
          </p>
        </div>

        <div class="switch-example">
          <div class="switch-disabled-row">
            <WuiToggleSwitch :is-on="false" disabled />
            <WuiToggleSwitch :is-on="true" disabled />
          </div>
          <p class="switch-example-caption">禁用状态(关 / 开)</p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Header" type="text" v-model="header" placeholder="开关标头文本" />
        <DemoOptionRow label="OnContent" type="text" v-model="onContent" placeholder="开启槽文本" />
        <DemoOptionRow label="OffContent" type="text" v-model="offContent" placeholder="关闭槽文本" />
        <DemoOptionRow label="IsOn" type="toggle" v-model="isOn" />
        <DemoOptionRow label="Disabled 禁用" type="toggle" v-model="disabled" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.switch-stage {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 40px;
}

.switch-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.switch-example-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.switch-disabled-row {
  display: flex;
  align-items: center;
  gap: 24px;
}

/* 实时状态行:状态点颜色随 IsOn 切换(等价官方示例的 ProgressRing 联动) */
.switch-state {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.switch-state-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--wui-toggle-switch-track-background-theme);
}

.switch-state--on .switch-state-dot {
  background: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
}
</style>
