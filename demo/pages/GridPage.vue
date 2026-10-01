<script setup lang="ts">
// GridPage.vue —— Grid 控件示例页(结构照抄 HomePage 母版)。
// 参数组合对照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/Grid/:
//   示例 1 = 官方 3x3GridControl(50/50/50 定义 + ColumnSpacing/RowSpacing 滑块 + 红色块
//   的 Grid.Column / Grid.Row 滑块),另按派发要求把行高列宽简写开放为实时编辑的文本框;
//   示例 2 = 跨行跨列(对照官方 Grid Tutorial 的 Span 用法,覆盖块压在编号瓦片上,收缩
//   Span 即露出被盖住的瓦片);
//   示例 3 = 官方示例页参数面板的同款排布(Auto 与 * 混排 + 12px 间距 + 每个子项显式
//   Grid.Column / Grid.Row),用库内真实控件组合。
import { computed, ref } from 'vue'
import WuiGrid from '@/components/Grid.vue'
import WuiSlider from '@/components/Slider.vue'
import WuiTextBlock from '@/components/TextBlock.vue'
import WuiToggleSwitch from '@/components/ToggleSwitch.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— 可调参数(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
const columnDefs = ref<string | number | boolean>('50, 50, 50')
const rowDefs = ref<string | number | boolean>('50, 50, 50')
const columnSpacing = ref<string | number | boolean>(8)
const rowSpacing = ref<string | number | boolean>(8)
const accentColumn = ref<string | number | boolean>(0)
const accentRow = ref<string | number | boolean>(0)
const spanColumn = ref<string | number | boolean>(2)
const spanRow = ref<string | number | boolean>(2)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const columnDefsText = computed(() => String(columnDefs.value))
const rowDefsText = computed(() => String(rowDefs.value))
const columnSpacingValue = computed(() => Math.max(toNumber(columnSpacing.value, 0), 0))
const rowSpacingValue = computed(() => Math.max(toNumber(rowSpacing.value, 0), 0))
const accentColumnValue = computed(() => toNumber(accentColumn.value, 0))
const accentRowValue = computed(() => toNumber(accentRow.value, 0))
const spanColumnValue = computed(() => toNumber(spanColumn.value, 2))
const spanRowValue = computed(() => toNumber(spanRow.value, 2))

// —— 示例 3(官方参数面板同款排布):列间距由行内滑块实时调节(滑块模型为 number 专用) ——
const formVolume = ref(40)
const formHints = ref(true)
const formSpacing = ref(12)

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 附加属性', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['ColumnDefinitions', 'string', '列定义简写:逗号分隔,"Auto" / 数字(像素) / "N*"(加权);缺省 "*"(示例 1 文本框实时调节)'],
  ['RowDefinitions', 'string', '行定义简写,规则同 ColumnDefinitions;缺省 "*"(示例 1 文本框实时调节)'],
  ['ColumnSpacing', 'number', '列间距,单位 px,WinUI 3 特性(示例 1 滑块实时调节)'],
  ['RowSpacing', 'number', '行间距,单位 px(示例 1 滑块实时调节)'],
  ['Grid.Column', 'data-grid-column 附加属性', '子项列索引(0 起,缺省 0);越界收敛到最后一列'],
  ['Grid.Row', 'data-grid-row 附加属性', '子项行索引(0 起,缺省 0);越界收敛到最后一行'],
  ['Grid.ColumnSpan', 'data-grid-column-span 附加属性', '子项跨列数(≥ 1,缺省 1);超出网格边界时收敛'],
  ['Grid.RowSpan', 'data-grid-row-span 附加属性', '子项跨行数(≥ 1,缺省 1);超出网格边界时收敛'],
  ['(无控件事件)', '—', '纯布局面板,无 WinUI 专属事件;原生事件监听(@click 等)经 $attrs 透传根元素'],
]

// 用法代码随参数实时更新(较长,放 computed;引号规则:外双内单)。
const usageCode = computed(
  () => `<WuiGrid
  column-definitions="${columnDefsText.value}"
  row-definitions="${rowDefsText.value}"
  :column-spacing="${columnSpacingValue.value}"
  :row-spacing="${rowSpacingValue.value}"
>
  <!-- data-grid-* 附加属性定位子项(0 起,等价 WinUI Grid.Column / Grid.Row) -->
  <div class="cell cell-accent" :data-grid-column="${accentColumnValue.value}" :data-grid-row="${accentRowValue.value}"></div>
  <div class="cell" data-grid-row="1"></div>
  <div class="cell" data-grid-column="1"></div>
  <div class="cell" data-grid-column="1" data-grid-row="1"></div>
</WuiGrid>`,
)
</script>

<template>
  <DemoPage wiki="Grid"
    title="Grid"
    description="以行和列排布控件与内容的布局面板:子项通过 data-grid-column / data-grid-row 附加属性定位(等价 WinUI Grid.Column / Grid.Row)。行高列宽简写、列 / 行间距与跨行跨列均可实时调参。"
  >
    <template #demo>
      <div class="grid-stage">
        <!-- 示例 1:行列定义简写 + 间距 + Grid.Column / Grid.Row 定位(对照官方 3x3GridControl) -->
        <div class="grid-example">
          <WuiGrid
            class="demo-grid"
            :column-definitions="columnDefsText"
            :row-definitions="rowDefsText"
            :column-spacing="columnSpacingValue"
            :row-spacing="rowSpacingValue"
          >
            <div
              class="grid-cell grid-cell-accent"
              :data-grid-column="accentColumnValue"
              :data-grid-row="accentRowValue"
            ></div>
            <div class="grid-cell grid-cell-a" data-grid-row="1"></div>
            <div class="grid-cell grid-cell-b" data-grid-column="1"></div>
            <div class="grid-cell grid-cell-c" data-grid-column="1" data-grid-row="1"></div>
          </WuiGrid>
          <p class="grid-example-caption">行列简写 + 间距 + 定位(对照官方 3x3 示例)</p>
        </div>

        <!-- 示例 2:跨行跨列(覆盖块压在编号瓦片上,收缩 Span 露出被盖住的瓦片) -->
        <div class="grid-example">
          <WuiGrid
            class="span-grid"
            column-definitions="1*, 1*, 1*, 1*"
            row-definitions="1*, 1*, 1*, 1*"
            :column-spacing="4"
            :row-spacing="4"
          >
            <div class="span-tile" data-grid-column="0" data-grid-row="0">1</div>
            <div class="span-tile" data-grid-column="1" data-grid-row="0">2</div>
            <div class="span-tile" data-grid-column="2" data-grid-row="0">3</div>
            <div class="span-tile" data-grid-column="3" data-grid-row="0">4</div>
            <div class="span-tile" data-grid-column="0" data-grid-row="1">5</div>
            <div class="span-tile" data-grid-column="1" data-grid-row="1">6</div>
            <div class="span-tile" data-grid-column="2" data-grid-row="1">7</div>
            <div class="span-tile" data-grid-column="3" data-grid-row="1">8</div>
            <div class="span-tile" data-grid-column="0" data-grid-row="2">9</div>
            <div class="span-tile" data-grid-column="1" data-grid-row="2">10</div>
            <div class="span-tile" data-grid-column="2" data-grid-row="2">11</div>
            <div class="span-tile" data-grid-column="3" data-grid-row="2">12</div>
            <div class="span-tile" data-grid-column="0" data-grid-row="3">13</div>
            <div class="span-tile" data-grid-column="1" data-grid-row="3">14</div>
            <div class="span-tile" data-grid-column="2" data-grid-row="3">15</div>
            <div class="span-tile" data-grid-column="3" data-grid-row="3">16</div>
            <div
              class="span-overlay"
              data-grid-column="1"
              data-grid-row="1"
              :data-grid-column-span="spanColumnValue"
              :data-grid-row-span="spanRowValue"
            >
              <span class="span-overlay-title">Span</span>
              <span class="span-overlay-size">{{ spanColumnValue }} × {{ spanRowValue }}</span>
            </div>
          </WuiGrid>
          <p class="grid-example-caption">跨行跨列(data-grid-*-span,对照官方 Grid Tutorial)</p>
        </div>

        <!-- 示例 3:官方示例页参数面板同款排布 —— Auto 与 * 混排 + 每个子项显式定位 -->
        <div class="grid-example">
          <WuiGrid
            class="form-grid"
            column-definitions="Auto, *"
            row-definitions="Auto, Auto, Auto"
            :column-spacing="formSpacing"
            :row-spacing="12"
          >
            <WuiTextBlock text="音量 Volume" data-grid-column="0" data-grid-row="0" />
            <WuiSlider
              v-model:value="formVolume"
              :minimum="0"
              :maximum="100"
              data-grid-column="1"
              data-grid-row="0"
            />
            <WuiTextBlock text="提示 Hints" data-grid-column="0" data-grid-row="1" />
            <WuiToggleSwitch v-model:is-on="formHints" data-grid-column="1" data-grid-row="1" />
            <WuiTextBlock text="列间距 Spacing" data-grid-column="0" data-grid-row="2" />
            <WuiSlider
              v-model:value="formSpacing"
              :minimum="0"
              :maximum="24"
              data-grid-column="1"
              data-grid-row="2"
            />
          </WuiGrid>
          <p class="grid-example-caption">Auto 与 * 混排组合实际控件(对照官方参数面板排布)</p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="ColumnDefinitions" type="text" v-model="columnDefs" placeholder="*, Auto, 2*" />
        <DemoOptionRow label="RowDefinitions" type="text" v-model="rowDefs" placeholder="*, Auto, 2*" />
        <DemoOptionRow label="ColumnSpacing" type="slider" v-model="columnSpacing" :min="0" :max="32" :step="1" />
        <DemoOptionRow label="RowSpacing" type="slider" v-model="rowSpacing" :min="0" :max="32" :step="1" />
        <DemoOptionRow label="Grid.Column · 强调块" type="slider" v-model="accentColumn" :min="0" :max="2" :step="1" />
        <DemoOptionRow label="Grid.Row · 强调块" type="slider" v-model="accentRow" :min="0" :max="2" :step="1" />
        <DemoOptionRow label="ColumnSpan · 覆盖块" type="slider" v-model="spanColumn" :min="1" :max="3" :step="1" />
        <DemoOptionRow label="RowSpan · 覆盖块" type="slider" v-model="spanRow" :min="1" :max="3" :step="1" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.grid-stage {
  /* 强调色统一走系统色钩子 + 项目回退链(demo/components/README.md 约定 1) */
  --grid-accent: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));

  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 40px;
}

.grid-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.grid-example-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 示例 1:固定 240x160 容器(星值/像素轨道需要确定尺寸,对照官方 Width=240 Height=160)—— */
.demo-grid {
  width: 240px;
  height: 160px;
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.grid-cell {
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.grid-cell-accent {
  width: 50px;
  height: 50px;
  background: var(--grid-accent);
}

/* 官方示例的 Blue / Green / Yellow 三个色块:主题里无对应色 token,
   改用强调色不同透明度(color-mix,theme.css 同款写法)区分,差异记入 wiki。 */
.grid-cell-a {
  width: 40px;
  height: 40px;
  background: color-mix(in srgb, var(--grid-accent) 55%, transparent);
}

.grid-cell-b {
  width: 40px;
  height: 40px;
  background: color-mix(in srgb, var(--grid-accent) 35%, transparent);
}

.grid-cell-c {
  width: 40px;
  height: 40px;
  background: color-mix(in srgb, var(--grid-accent) 20%, transparent);
}

/* —— 示例 2:4×4 星值网格,固定 240x240 —— */
.span-grid {
  width: 240px;
  height: 240px;
}

.span-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-system-control-background-list-low);
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 覆盖块是最后一个子项,按 DOM 顺序压在瓦片之上(WinUI 同序规则) */
.span-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--wui-system-control-foreground-alt-high);
  background: var(--grid-accent);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.span-overlay-title {
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
}

.span-overlay-size {
  font-size: var(--wui-tool-tip-content-theme-font-size);
}

/* —— 示例 3:Auto 与 * 混排,固定宽度保证 * 列有确定尺寸 —— */
.form-grid {
  width: 320px;
}
</style>
