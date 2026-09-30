// 控件卡片图标解析:catalog 条目 → Segoe 字形码点(配合 FontIcon 渲染)。
// 数据约定:字形「名称 → 码点」一律查 demo/data/fontIconGlyphs.ts(生成物,1533 条,
// 名称来自官方 IconsData.json),本文件只登记名称、不写裸码点,避免撞码;
// 未登记或名称失配的条目回退组默认,再回退全局 fallback,保证任何条目都有图标。
import type { CatalogGroup, CatalogItem } from './catalog'
import { FONT_ICON_GLYPHS } from './fontIconGlyphs'

/** 控件条目 → 字形名称(官方建议名,见 fontIconGlyphs.ts 头注)。 */
const ITEM_GLYPH_NAMES: Record<string, string> = {
  // Fundamentals
  XamlResources: 'Dictionary',
  XamlStyles: 'BrushSize',
  Binding: 'Link',
  Templates: 'Copy',
  CustomUserControls: 'Repair',
  CustomXamlConditionals: 'Filter',
  ScratchPad: 'QuickNote',
  // Design
  Color: 'Color',
  Geometry: 'CircleShapeSolid',
  Iconography: 'Emoji',
  Spacing: 'PageMarginPortraitNormal',
  Typography: 'Font',
  // Accessibility
  AccessibilityColorContrast: 'Contrast',
  AccessibilityKeyboard: 'KeyboardStandard',
  AccessibilityScreenReader: 'Volume',
  // Menus & toolbars
  AppBarButton: 'AllApps',
  AppBarSeparator: 'Pinned',
  AppBarToggleButton: 'CheckboxComposite',
  CommandBar: 'More',
  CommandBarFlyout: 'ChevronUp',
  MenuBar: 'List',
  MenuFlyout: 'Sort',
  SwipeControl: 'Swipe',
  StandardUICommand: 'Save',
  XamlUICommand: 'CommandPrompt',
  // Collections
  FlipView: 'Slideshow',
  GridView: 'GridView',
  ItemsRepeater: 'Refresh',
  ItemsView: 'View',
  ListView: 'List',
  PullToRefresh: 'Sync',
  TreeView: 'TreeFolderFolderOpen',
  // Date & time
  CalendarDatePicker: 'CalendarWeek',
  CalendarView: 'Calendar',
  DatePicker: 'CalendarDay',
  TimePicker: 'Clock',
  // Basic input
  Button: 'TouchPointer',
  DropDownButton: 'ChevronDown',
  HyperlinkButton: 'Link',
  RepeatButton: 'Redo',
  ToggleButton: 'Switch',
  SplitButton: 'ChevronDown',
  ToggleSplitButton: 'ChromeSwitch',
  CheckBox: 'Checkbox',
  ColorPicker: 'ColorSolid',
  ComboBox: 'ChevronDown',
  RadioButton: 'RadioBtnOn',
  RatingControl: 'FavoriteStar',
  Slider: 'SliderThumb',
  ToggleSwitch: 'Switch',
  // Status & info
  InfoBadge: 'ImportantBadge12',
  InfoBar: 'Info',
  ProgressBar: 'ThreeBars',
  ProgressRing: 'FourBars',
  ToolTip: 'Comment',
  // Dialogs & flyouts
  ContentDialog: 'Message',
  Flyout: 'OpenPane',
  Popup: 'OpenInNewWindow',
  TeachingTip: 'Lightbulb',
  // Scrolling
  AnnotatedScrollBar: 'Ruler',
  PipsPager: 'PaginationDotSolid10',
  ScrollView: 'Down',
  ScrollViewer: 'Page',
  SemanticZoom: 'ZoomMode',
  // Layout
  Border: 'FitPage',
  Canvas: 'Draw',
  Expander: 'ChevronDown',
  Grid: 'Tiles',
  RelativePanel: 'SwitchApps',
  SplitView: 'DockLeft',
  StackPanel: 'AlignLeft',
  VariableSizedWrapGrid: 'ResizeTouchLarger',
  Viewbox: 'Zoom',
  // Navigation
  BreadcrumbBar: 'ChevronRight',
  NavigationView: 'GlobalNavButton',
  Pivot: 'Library',
  SelectorBar: 'Highlight',
  TabView: 'TwoPage',
  // Media
  AnimatedVisualPlayer: 'Play',
  CaptureElementPreview: 'Camera',
  Image: 'Photo',
  MapControl: 'MapPin',
  MediaPlayerElement: 'Video',
  PersonPicture: 'Contact',
  Sound: 'Volume',
  WebView2: 'Globe',
  // Styles
  Acrylic: 'HalfAlpha',
  AnimatedIcon: 'LightningBolt',
  CompactSizing: 'ResizeMouseSmall',
  IconElement: 'Emoji',
  Line: 'Remove',
  Shape: 'CircleShapeSolid',
  RadialGradientBrush: 'InkingColorFill',
  SystemBackdrops: 'DesktopLeafTwo',
  SystemBackdropElement: 'FullScreen',
  ThemeShadow: 'HalfAlpha',
  // Text
  AutoSuggestBox: 'Search',
  NumberBox: 'Calculator',
  PasswordBox: 'Lock',
  RichEditBox: 'FormatText',
  RichTextBlock: 'TextBulletListSquare',
  TextBlock: 'Font',
  TextBox: 'Edit',
  // Motion
  XamlCompInterop: 'Code',
  ConnectedAnimation: 'Play',
  EasingFunction: 'FourBars',
  ImplicitTransition: 'RepeatAll',
  PageTransition: 'PageRight',
  ThemeTransition: 'Brightness',
  ParallaxView: 'MapLayers',
  // Multiple windows
  AppWindow: 'BackToWindow',
  AppWindowTitleBar: 'ChromeMaximize',
  CreateMultipleWindows: 'NewWindow',
  TitleBar: 'ChromeMinimize',
  // System
  Clipboard: 'Paste',
  ContentIsland: 'GridViewSmall',
  StoragePickers: 'OpenFile',
  // Shell
  AppNotification: 'ActionCenterNotification',
  BadgeNotificationManager: 'Badge',
  JumpList: 'Recent',
}

/** 分组默认字形(组内未登记条目回退到此)。 */
const GROUP_GLYPH_NAMES: Record<string, string> = {
  FundamentalsItem: 'Library',
  DesignItem: 'Color',
  AccessibilityItem: 'Contrast',
  MenusAndToolbars: 'More',
  Collections: 'List',
  DateAndTime: 'Calendar',
  BasicInput: 'TouchPointer',
  StatusAndInfo: 'Info',
  DialogsAndFlyouts: 'OpenPane',
  Scrolling: 'Page',
  Layout: 'Tiles',
  Navigation: 'GlobalNavButton',
  Media: 'Play',
  Styles: 'ColorSolid',
  Text: 'Font',
  Motion: 'PageRight',
  MultipleWindows: 'NewWindow',
  System: 'CommandPrompt',
  Shell: 'Badge',
}

/** 全局兜底字形名称。 */
const FALLBACK_GLYPH_NAME = 'Page'

/** 名称 → 字形码点字符;名称未命中返回 undefined。 */
function glyphByName(name: string): string | undefined {
  const info = FONT_ICON_GLYPHS.find((glyph) => glyph.name === name)
  if (!info) return undefined
  return String.fromCodePoint(Number.parseInt(info.code, 16))
}

/**
 * 解析控件卡片的 FontIcon 字形字符:
 * 条目登记名 → 分组默认 → 全局兜底,三级都保证命中 fontIconGlyphs.ts 的已知码点。
 */
export function controlGlyph(item: CatalogItem, group: CatalogGroup): string {
  const name =
    ITEM_GLYPH_NAMES[item.id] ?? GROUP_GLYPH_NAMES[group.id] ?? FALLBACK_GLYPH_NAME
  return glyphByName(name) ?? glyphByName(FALLBACK_GLYPH_NAME) ?? ''
}
