<script setup lang="ts">
// ContentDialogPage.vue —— ContentDialog 控件示例页(结构照抄 HomePage 母版)。
// 参数组合对照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/ContentDialog/:
//   ① BasicContentDialogContent —— 基本对话框(Save your work? + 云上传复选框正文);
//   ② 官方 ContentDialogContent 的 args.cancel 语义扩展 —— 可取消的保存对话框
//      (未确认时 primaryButtonClick 里 args.cancel = true 阻止关闭,Deferral 的简化演示);
//   ③ ContentDialogWithoutDefault —— Replace file? 三按钮 + defaultButton 可调(None/Primary/
//      Secondary/Close),按钮文本可清空以演示「空则隐藏」。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiCheckBox from '@/components/CheckBox.vue'
import WuiContentDialog from '@/components/ContentDialog.vue'
import type { ContentDialogButtonValue } from '@/components/ContentDialog.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'

/* —— 示例 1:基本对话框(官方 BasicContentDialogContent 对照)—— */
const basicOpen = ref(false)
const basicResult = ref('尚未打开')
const basicUploaded = ref<boolean | 'indeterminate'>(false)

function logBasicResult(text: string): void {
  basicResult.value = text
}

/* —— 示例 2:可取消的保存对话框(primaryButtonClick + args.cancel)—— */
const saveOpen = ref(false)
const saveAcknowledged = ref<boolean | 'indeterminate'>(false)
const saveHint = ref('未勾选确认项时点击「保存」,primaryButtonClick 里 args.cancel = true 会阻止关闭。')

function onPrimarySave(args: { cancel: boolean }): void {
  if (saveAcknowledged.value !== true) {
    // WinUI Deferral 的简化形态:同步置 cancel = true 即阻止关闭(差异见 wiki)
    args.cancel = true
    saveHint.value = 'primaryButtonClick(args.cancel = true):已阻止关闭,请先勾选确认项。'
  } else {
    saveHint.value = '已确认,对话框关闭。'
  }
}

/* —— 示例 3:三按钮 + defaultButton(官方 ContentDialogWithoutDefault 对照)—— */
const threeOpen = ref(false)
const threeResult = ref('尚未打开')
const defaultButton = ref<string | number | boolean>('Primary')
const primaryText = ref<string | number | boolean>('Replace')
const secondaryText = ref<string | number | boolean>('Keep')
const closeText = ref<string | number | boolean>('Cancel')

const defaultButtonOptions = [
  { label: 'Primary(默认)', value: 'Primary' },
  { label: 'Secondary', value: 'Secondary' },
  { label: 'Close', value: 'Close' },
  { label: 'None(无默认按钮)', value: 'None' },
]

const defaultButtonValue = computed<ContentDialogButtonValue>(() => {
  const value = String(defaultButton.value)
  return value === 'Secondary' || value === 'Close' || value === 'None' ? value : 'Primary'
})

const threePrimaryText = computed(() => String(primaryText.value))
const threeSecondaryText = computed(() => String(secondaryText.value))
const threeCloseText = computed(() => String(closeText.value))

const threeResultTexts: Record<string, string> = {
  primaryButtonClick: 'primaryButtonClick → 关闭(用户选择 Replace)',
  secondaryButtonClick: 'secondaryButtonClick → 关闭(用户选择 Keep)',
  closeButtonClick: 'closeButtonClick → 关闭(用户取消 / Esc)',
}

function onThreePrimary(args: { cancel: boolean }): void {
  args.cancel = false
  threeResult.value = threeResultTexts.primaryButtonClick
}

function onThreeSecondary(args: { cancel: boolean }): void {
  args.cancel = false
  threeResult.value = threeResultTexts.secondaryButtonClick
}

function onThreeClose(args: { cancel: boolean }): void {
  args.cancel = false
  threeResult.value = threeResultTexts.closeButtonClick
}

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['title', 'string', '标题文本(WinUI Title 的 string 形态);富内容用 #title 插槽,插槽优先'],
  ['primaryButtonText', 'string', '主按钮文本;空串不渲染该按钮'],
  ['secondaryButtonText', 'string', '次按钮文本;空串不渲染该按钮'],
  ['closeButtonText', 'string', '关闭按钮文本;空串不渲染该按钮'],
  ['defaultButton', "'Primary' | 'Secondary' | 'Close' | 'None'", '默认按钮(WinUI DefaultButton):强调色样式 + 初始焦点落位 + Enter 触发,默认 None'],
  ['isPrimaryButtonEnabled', 'boolean', '主按钮可用性(WinUI IsPrimaryButtonEnabled),默认 true'],
  ['isSecondaryButtonEnabled', 'boolean', '次按钮可用性(WinUI IsSecondaryButtonEnabled),默认 true'],
  ['isOpen', 'boolean(v-model:is-open)', '开关状态双向绑定(WinUI ShowAsync 的声明式等价);按钮 / Esc 关闭时自动写回 false'],
  ['primaryButtonClick', '(args: { cancel: boolean }) => void', '主按钮点击(Esc 不触发);处理器内 args.cancel = true 可阻止关闭'],
  ['secondaryButtonClick', '(args: { cancel: boolean }) => void', '次按钮点击;args.cancel 语义同上'],
  ['closeButtonClick', '(args: { cancel: boolean }) => void', '关闭按钮点击或按下 Esc(WinUI Esc 走 CloseButton 语义);args.cancel 语义同上'],
  ['default slot', '—', '对话框正文(任意元素;对照官方正文的文本 + 复选框组合)'],
  ['title slot', '—', '富标题(WinUI Title / TitleTemplate 对象形态)'],
]

const usageCode = computed(
  // 注意:闭合 script 标签在模板串内需转义为 <\/script>(渲染结果不变),
  // 否则 SFC 块提取器会在该处误判 script 块提前结束(ToolTipPage 同款问题,见报告)。
  () => `<script setup lang="ts">
import { ref } from 'vue'
import WuiContentDialog from '@/components/ContentDialog.vue'

const open = ref(false)

function onPrimary(args: { cancel: boolean }) {
  if (!canSave()) args.cancel = true // 阻止关闭
}
<\/script>

<template>
  <WuiButton @click="open = true">Show dialog</WuiButton>

  <WuiContentDialog
    v-model:is-open="open"
    title="Save your work?"
    primary-button-text="Save"
    secondary-button-text="Don't Save"
    close-button-text="Cancel"
    default-button="Primary"
    @primary-button-click="onPrimary"
  >
    Lorem ipsum dolor sit amet, adipisicing elit.
  </WuiContentDialog>
</template>`,
)
</script>

<template>
  <DemoPage wiki="ContentDialog"
    title="ContentDialog"
    description="用 ContentDialog 显示相关信息,或提供可承载任意内容的模态对话框体验。模态由全屏遮罩挡指针实现:遮罩点击不关闭,只能通过命令按钮或 Esc 关闭(WinUI 语义);打开后焦点圈定在对话框内,关闭后归还。"
  >
    <template #demo>
      <div class="dialog-stage">
        <!-- 官方示例 1 对照:基本对话框(Save your work?) -->
        <div class="dialog-example">
          <div class="dialog-row">
            <WuiButton @click="basicOpen = true">Show dialog</WuiButton>
            <span class="dialog-log">{{ basicResult }}</span>
          </div>
          <p class="dialog-caption">基本对话框:主 + 关闭两按钮,defaultButton = Primary(初始焦点与强调色落主按钮)</p>
        </div>

        <WuiContentDialog
          v-model:is-open="basicOpen"
          title="Save your work?"
          primary-button-text="Save"
          close-button-text="Cancel"
          default-button="Primary"
          @primary-button-click="logBasicResult('primaryButtonClick → 已保存并关闭')"
          @close-button-click="logBasicResult('closeButtonClick → 已取消(按钮或 Esc)')"
        >
          <p class="dialog-body-text">Lorem ipsum dolor sit amet, adipisicing elit.</p>
          <WuiCheckBox v-model:checked="basicUploaded" content="Upload your content to the cloud." />
        </WuiContentDialog>

        <!-- 官方示例扩展:可取消的保存对话框(args.cancel 演示) -->
        <div class="dialog-example">
          <div class="dialog-row">
            <WuiButton @click="saveOpen = true">可取消的保存对话框</WuiButton>
            <span class="dialog-log">{{ saveHint }}</span>
          </div>
          <p class="dialog-caption">
            primaryButtonClick 处理器内置 args.cancel = true 即阻止关闭(WinUI Deferral 的简化形态);
            三按钮 + 主按钮可用,先勾选确认项再保存才会真正关闭。
          </p>
        </div>

        <WuiContentDialog
          v-model:is-open="saveOpen"
          title="保存更改?"
          primary-button-text="Save"
          secondary-button-text="Don't Save"
          close-button-text="Cancel"
          default-button="Primary"
          @primary-button-click="onPrimarySave"
          @secondary-button-click="saveHint = 'secondaryButtonClick → 放弃更改并关闭。'"
          @close-button-click="saveHint = 'closeButtonClick → 已取消(按钮或 Esc)。'"
        >
          <p class="dialog-body-text">检测到未保存的更改,是否保存?</p>
          <WuiCheckBox v-model:checked="saveAcknowledged" content="我已确认其他工作均已保存。" />
        </WuiContentDialog>

        <!-- 官方示例 3 对照:三按钮 + defaultButton(Replace file?) -->
        <div class="dialog-example">
          <div class="dialog-row">
            <WuiButton @click="threeOpen = true">Show dialog without default button</WuiButton>
            <span class="dialog-log">{{ threeResult }}</span>
          </div>
          <p class="dialog-caption">
            三按钮 + defaultButton 可调(参数面板):None 时无强调色且初始焦点落第一个按钮;
            按钮文本清空即隐藏对应按钮。isOpen 经 v-model 双向绑定(面板开关可直接打开对话框)。
          </p>
        </div>

        <WuiContentDialog
          v-model:is-open="threeOpen"
          title="Replace file?"
          :primary-button-text="threePrimaryText"
          :secondary-button-text="threeSecondaryText"
          :close-button-text="threeCloseText"
          :default-button="defaultButtonValue"
          @primary-button-click="onThreePrimary"
          @secondary-button-click="onThreeSecondary"
          @close-button-click="onThreeClose"
        >
          <p class="dialog-body-text">Lorem ipsum dolor sit amet, adipisicing elit.</p>
          <WuiCheckBox content="Upload your content to the cloud." />
        </WuiContentDialog>

        <p class="dialog-hint">
          交互:打开后焦点落入 defaultButton(无则第一个按钮)并被圈定(Tab 循环);Enter 触发 defaultButton;
          Esc 等价点击关闭按钮;点击遮罩不关闭(WinUI 模态语义);关闭后焦点归还触发元素。
        </p>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="defaultButton(示例 3)" type="select" v-model="defaultButton" :options="defaultButtonOptions" />
        <DemoOptionRow label="isOpen(示例 3,v-model)" type="toggle" v-model="threeOpen" />
        <DemoOptionRow label="PrimaryButtonText(示例 3)" type="text" v-model="primaryText" placeholder="留空则隐藏主按钮" />
        <DemoOptionRow label="SecondaryButtonText(示例 3)" type="text" v-model="secondaryText" placeholder="留空则隐藏次按钮" />
        <DemoOptionRow label="CloseButtonText(示例 3)" type="text" v-model="closeText" placeholder="留空则隐藏关闭按钮" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.dialog-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.dialog-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.dialog-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.dialog-log {
  max-width: 420px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.dialog-caption {
  margin: 0;
  max-width: 620px;
  text-align: center;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.dialog-hint {
  margin: 0;
  max-width: 560px;
  text-align: center;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 对话框正文小排版(对照官方 ContentDialogContent:文本 + 复选框) */
.dialog-body-text {
  margin: 0 0 8px;
}
</style>
