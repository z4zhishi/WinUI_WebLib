// 自动生成,勿手改 —— 由 docs/temp/build-catalog.mjs 从
// CK/WinUI-Gallery/WinUIGallery/SampleSupport/Data/ControlInfoData.json 生成。
// 再生成:node docs/temp/build-catalog.mjs(脚本内置组数/条目数断言,防止源漂移)。

export interface CatalogDoc {
  title: string
  uri: string
}

export interface CatalogItem {
  /** 唯一标识(= 源 UniqueId) */
  id: string
  title: string
  /** 副标题(= 源 Subtitle),缺失时省略 */
  subtitle?: string
  /** 描述(= 源 Description),缺失时为空串 */
  description: string
  tags: string[]
  /** 相关文档链接(= 源 Docs),缺失时为空数组 */
  docs: CatalogDoc[]
  /** 图示文件名(= 源 ImagePath 最后一段),缺失时省略 */
  image?: string
  /** 是否新增控件(= 源 IsNew),非 true 时省略 */
  isNew?: boolean
  /** 相关控件 id(= 源 RelatedControls),缺失时为空数组 */
  related: string[]
}

export interface CatalogGroup {
  /** 组标识(= 源 UniqueId) */
  id: string
  title: string
  isSpecialSection: boolean
  items: CatalogItem[]
}

export const CATALOG: CatalogGroup[] = [
  {
    id: 'FundamentalsItem',
    title: 'Fundamentals',
    isSpecialSection: true,
    items: [
      {
        id: 'XamlResources',
        title: 'Resources',
        subtitle: 'Reusable definitions for shared values to ensure consistency and maintainability.',
        description: 'In WinUI 3, XAML resources are reusable objects like colors, brushes, or strings, defined once and used throughout your app to maintain consistency and simplify updates. These resources are typically stored in a ResourceDictionary for better organization and scalability. Special theme resources adapt automatically to light or dark modes, ensuring a seamless look across themes.',
        tags: [
          'ResourceDictionary',
          'StaticResource',
          'ThemeResource',
          'Resources',
          'lightweight styling',
        ],
        docs: [
          {
            title: 'ResourceDictionary and XAML resource references',
            uri: 'https://learn.microsoft.com/windows/apps/design/style/xaml-resource-dictionary',
          },
          {
            title: 'ResourceDictionary - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.resourcedictionary',
          },
          {
            title: 'XAML theme resources',
            uri: 'https://learn.microsoft.com/windows/apps/design/style/xaml-theme-resources',
          },
        ],
        image: 'CodeTagIcon.png',
        isNew: true,
        related: [
          'XamlStyles',
          'Templates',
          'Binding',
        ],
      },
      {
        id: 'XamlStyles',
        title: 'Style',
        subtitle: 'A XAML style is a Reusable property settings to define consistent UI design elements.',
        description: 'XAML Styles in WinUI 3 are reusable sets of property values that you can apply to multiple controls. They help maintain a consistent look and feel across your app. Instead of setting the same properties on every control, you define a style once and then reuse it wherever needed.',
        tags: [
          'Setter',
          'BasedOn',
          'implicit style',
          'default style',
        ],
        docs: [
          {
            title: 'Style - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.style',
          },
          {
            title: 'XAML styles',
            uri: 'https://learn.microsoft.com/windows/apps/design/style/xaml-styles',
          },
        ],
        image: 'CodeTagIcon.png',
        isNew: true,
        related: [
          'XamlResources',
          'Templates',
          'Binding',
        ],
      },
      {
        id: 'Binding',
        title: 'Binding',
        subtitle: 'Connecting UI elements to data for automatic synchronization and updates.',
        description: 'Binding in WinUI 3 is a way to connect a property of a control to a source, such as another property, a data object, or a view model. It keeps the data synchronized between the source and the target control, enabling dynamic updates.',
        tags: [
          'x:Bind',
          'data binding',
          'INotifyPropertyChanged',
          'ObservableCollection',
          'TwoWay',
          'OneWay',
          'DataContext',
        ],
        docs: [
          {
            title: 'Data binding',
            uri: 'https://learn.microsoft.com/windows/apps/develop/data-binding/',
          },
          {
            title: '{x:Bind} markup extension',
            uri: 'https://learn.microsoft.com/windows/uwp/xaml-platform/x-bind-markup-extension',
          },
          {
            title: '{Binding} markup extension',
            uri: 'https://learn.microsoft.com/windows/uwp/xaml-platform/binding-markup-extension',
          },
          {
            title: 'Binding - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.data.binding',
          },
          {
            title: 'IValueConverter Interface - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.data.ivalueconverter',
          },
        ],
        image: 'CodeTagIcon.png',
        isNew: true,
        related: [
          'XamlResources',
          'XamlStyles',
          'Templates',
        ],
      },
      {
        id: 'Templates',
        title: 'Templates',
        subtitle: 'Customize controls\' visuals, item layouts, and data presentation in XAML.',
        description: 'A template defines the structure and appearance of a control. Unlike styles, which set properties, templates allow you to completely customize how a control looks by redefining its visual tree (the XAML elements that make up the control). Templates provide the flexibility to change the look of controls while maintaining their functionality.',
        tags: [
          'ControlTemplate',
          'DataTemplate',
          'ItemTemplate',
          'DataTemplateSelector',
        ],
        docs: [
          {
            title: 'XAML Control Templates',
            uri: 'https://learn.microsoft.com/windows/apps/design/style/xaml-control-templates',
          },
          {
            title: 'ControlTemplate - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.controltemplate',
          },
          {
            title: 'DataTemplate - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.datatemplate',
          },
          {
            title: 'ItemsPanelTemplate - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.itemspaneltemplate',
          },
        ],
        image: 'CodeTagIcon.png',
        isNew: true,
        related: [
          'Binding',
          'XamlStyles',
          'CustomUserControls',
        ],
      },
      {
        id: 'CustomUserControls',
        title: 'Custom & User Controls',
        subtitle: 'Create reusable UI components with custom functionality and appearance.',
        description: 'Custom controls and user controls allow to create reusable UI components with unique behavior and styling. A UserControl is a simple way to encapsulate a UI layout, while a custom control provides full styling and templating flexibility. Both approaches help in building modular and maintainable applications.',
        tags: [
          'UserControl',
          'custom control',
          'reusable control',
        ],
        docs: [
          {
            title: 'Build XAML controls',
            uri: 'https://learn.microsoft.com/windows/apps/winui/winui3/xaml-templated-controls-csharp-winui-3',
          },
          {
            title: 'Control - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.control',
          },
          {
            title: 'UserControl - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.usercontrol',
          },
        ],
        image: 'CustomControls.png',
        isNew: true,
        related: [
          'Templates',
          'XamlStyles',
        ],
      },
      {
        id: 'CustomXamlConditionals',
        title: 'XAML Conditions',
        subtitle: 'Define custom XAML conditions evaluated at parse time using IXamlCondition.',
        description: 'XAML conditions let you conditionally include markup based on application-specific state such as feature flags, device capabilities, or configuration. Implement IXamlCondition (Windows App SDK 2.0) and reference your condition from a conditional XAML namespace. Conditions are evaluated by the XAML parser when a page is loaded and the result for each (condition, argument) pair is cached for the lifetime of the process.',
        tags: [
          'IXamlCondition',
          'conditional XAML',
          'markup extension',
        ],
        docs: [
          {
            title: 'IXamlCondition - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.markup.ixamlcondition',
          },
        ],
        image: 'CodeTagIcon.png',
        isNew: true,
        related: [],
      },
      {
        id: 'ScratchPad',
        title: 'Scratch Pad',
        subtitle: 'Scratch pad for testing simple XAML markup',
        description: 'Provides an edit box where you can type in some markup and load it to see how it looks and behaves.',
        tags: [
          'playground',
          'sandbox',
          'test markup',
        ],
        docs: [
          {
            title: 'XamlReader - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.markup.xamlreader',
          },
        ],
        image: 'ScratchPad.png',
        related: [],
      },
    ],
  },
  {
    id: 'DesignItem',
    title: 'Design',
    isSpecialSection: true,
    items: [
      {
        id: 'Color',
        title: 'Color',
        subtitle: 'Balanced color design creates clarity and aesthetic harmony.',
        description: '',
        tags: [
          'palette',
          'brush',
          'accent color',
          'theme color',
        ],
        docs: [
          {
            title: 'Colors in Windows 11',
            uri: 'https://learn.microsoft.com/windows/apps/design/signature-experiences/color',
          },
          {
            title: 'Windows UI Kit (Figma)',
            uri: 'https://aka.ms/WinUI/3.0-figma-toolkit',
          },
          {
            title: 'WinUI Theme Resources (GitHub)',
            uri: 'https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/Common_themeresources_any.xaml',
          },
        ],
        image: 'ColorPaletteResources.png',
        related: [],
      },
      {
        id: 'Geometry',
        title: 'Geometry',
        subtitle: 'Clear geometric design ensures visual coherence and structure.',
        description: '',
        tags: [
          'path',
          'vector',
          'figures',
        ],
        docs: [
          {
            title: 'Geometry in Windows 11',
            uri: 'https://learn.microsoft.com/windows/apps/design/signature-experiences/geometry',
          },
          {
            title: 'WinUI Theme Resources (GitHub)',
            uri: 'https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/Common_themeresources_any.xaml',
          },
        ],
        image: 'Shape.png',
        related: [],
      },
      {
        id: 'Iconography',
        title: 'Iconography',
        subtitle: 'Icons are a visual design language that can be used to communicate information quickly and effectively.',
        description: 'The icons below use Segoe Fluent Icons on Windows 11 and Segoe MDL2 Assets on Windows 10.',
        tags: [
          'icons',
          'glyph',
          'Segoe Fluent Icons',
          'FontIcon',
          'SymbolIcon',
          'icon font',
        ],
        docs: [
          {
            title: 'Iconography in Windows',
            uri: 'https://learn.microsoft.com/windows/apps/design/signature-experiences/iconography#system-icons',
          },
          {
            title: 'Segoe Fluent Icons font',
            uri: 'https://learn.microsoft.com/windows/apps/design/style/segoe-fluent-icons-font',
          },
          {
            title: 'Segoe MDL2 Assets font',
            uri: 'https://learn.microsoft.com/windows/apps/design/style/segoe-ui-symbol-font',
          },
        ],
        image: 'IconElement.png',
        related: [],
      },
      {
        id: 'Spacing',
        title: 'Spacing',
        subtitle: 'Thoughtful spacing design enhances readability and flow.',
        description: '',
        tags: [
          'margin',
          'padding',
          'layout spacing',
        ],
        docs: [
          {
            title: 'Content design basics',
            uri: 'https://learn.microsoft.com/windows/apps/design/basics/content-basics',
          },
        ],
        image: 'CompactSizing.png',
        related: [],
      },
      {
        id: 'Typography',
        title: 'Typography',
        subtitle: 'Typography design guides attention with intuitive fonts and hierarchy.',
        description: '',
        tags: [
          'font',
          'text style',
          'TitleTextBlockStyle',
          'BodyTextBlockStyle',
          'font size',
        ],
        docs: [
          {
            title: 'Typography in Windows Apps',
            uri: 'https://learn.microsoft.com/windows/apps/design/style/typography',
          },
          {
            title: 'XAML theme resources',
            uri: 'https://learn.microsoft.com/windows/apps/design/style/xaml-theme-resources#the-xaml-type-ramp',
          },
          {
            title: 'Typography in Windows 11',
            uri: 'https://learn.microsoft.com/windows/apps/design/signature-experiences/typography',
          },
        ],
        image: 'TextBlock.png',
        related: [],
      },
    ],
  },
  {
    id: 'AccessibilityItem',
    title: 'Accessibility',
    isSpecialSection: true,
    items: [
      {
        id: 'AccessibilityColorContrast',
        title: 'Color Contrast',
        subtitle: 'High contrast design ensures accessibility for all users.',
        description: '',
        tags: [
          'high contrast',
          'WCAG',
          'accessibility',
        ],
        docs: [
          {
            title: 'Accessibility',
            uri: 'https://learn.microsoft.com/windows/apps/design/accessibility/accessibility',
          },
          {
            title: 'Automation Properties - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.automation.automationproperties',
          },
        ],
        image: 'Accessibility.png',
        related: [],
      },
      {
        id: 'AccessibilityKeyboard',
        title: 'Keyboard Navigation',
        subtitle: 'Keyboard-friendly design enables seamless interactions.',
        description: '',
        tags: [
          'keyboard',
          'tab navigation',
          'access keys',
          'focus',
          'accessibility',
        ],
        docs: [
          {
            title: 'Accessibility',
            uri: 'https://learn.microsoft.com/windows/apps/design/accessibility/accessibility',
          },
          {
            title: 'Accessibility overview',
            uri: 'https://learn.microsoft.com/windows/apps/design/accessibility/accessibility-overview',
          },
          {
            title: 'Keyboard accessibility',
            uri: 'https://learn.microsoft.com/windows/apps/design/accessibility/keyboard-accessibility',
          },
          {
            title: 'Keyboard interactions',
            uri: 'https://learn.microsoft.com/windows/apps/design/input/keyboard-interactions',
          },
          {
            title: 'Access keys',
            uri: 'https://learn.microsoft.com/windows/apps/design/input/access-keys',
          },
          {
            title: 'Keyboard accelerators',
            uri: 'https://learn.microsoft.com/windows/apps/design/input/keyboard-accelerators',
          },
          {
            title: 'Focus navigation for keyboard, gamepad, remote control, and accessibility tools',
            uri: 'https://learn.microsoft.com/windows/apps/design/input/focus-navigation',
          },
          {
            title: 'Automation Properties - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.automation.automationproperties',
          },
        ],
        image: 'Accessibility.png',
        related: [],
      },
      {
        id: 'AccessibilityScreenReader',
        title: 'Screen Reader',
        subtitle: 'Inclusive design ensures meaningful content for assistive technologies.',
        description: '',
        tags: [
          'Narrator',
          'AutomationProperties',
          'assistive technology',
          'accessibility',
        ],
        docs: [
          {
            title: 'Accessibility',
            uri: 'https://learn.microsoft.com/windows/apps/design/accessibility/accessibility',
          },
          {
            title: 'Accessibility overview',
            uri: 'https://learn.microsoft.com/windows/apps/design/accessibility/accessibility-overview',
          },
          {
            title: 'Expose basic accessibility information',
            uri: 'https://learn.microsoft.com/windows/apps/design/accessibility/basic-accessibility-information',
          },
          {
            title: 'Landmarks and Headings',
            uri: 'https://learn.microsoft.com/windows/apps/design/accessibility/landmarks-and-headings',
          },
          {
            title: 'Accessible text requirements',
            uri: 'https://learn.microsoft.com/windows/apps/design/accessibility/accessible-text-requirements',
          },
          {
            title: 'Complete guide to Narrator',
            uri: 'https://support.microsoft.com/windows/complete-guide-to-narrator-e4397a0d-ef4f-b386-d8ae-c172f109bdb1',
          },
        ],
        image: 'Accessibility.png',
        related: [],
      },
    ],
  },
  {
    id: 'MenusAndToolbars',
    title: 'Menus & toolbars',
    isSpecialSection: false,
    items: [
      {
        id: 'AppBarButton',
        title: 'AppBarButton',
        subtitle: 'A button that\'s styled for use in a CommandBar.',
        description: 'AppBarButton differs from standard buttons in several ways:\n- Their default appearance is a transparent background with a smaller size.\n- You use the Label and Icon properties to set the content instead of the Content property. The Content property is ignored.\n- The button\'s IsCompact property controls its size.',
        tags: [
          'toolbar button',
          'command button',
        ],
        docs: [
          {
            title: 'AppBarButton - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.appbarbutton',
          },
          {
            title: 'SymbolIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.symbolicon',
          },
          {
            title: 'FontIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.fonticon',
          },
          {
            title: 'BitmapIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.bitmapicon',
          },
          {
            title: 'PathIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.pathicon',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/command-bar',
          },
        ],
        image: 'AppBarButton.png',
        related: [
          'AppBarToggleButton',
          'AppBarSeparator',
          'CommandBar',
        ],
      },
      {
        id: 'AppBarSeparator',
        title: 'AppBarSeparator',
        subtitle: 'A vertical line that\'s used to visually separate groups of commands in an app bar.',
        description: 'An AppBarSeparator creates a vertical line to visually separate groups of commands in a app bar. It has a compact state with reduced padding to match the compact state of the AppBarButton and AppBarToggleButton controls.',
        tags: [
          'divider',
        ],
        docs: [
          {
            title: 'AppBarSeparator - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.appbarseparator',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/command-bar',
          },
        ],
        image: 'AppBarSeparator.png',
        related: [
          'AppBarButton',
          'AppBarToggleButton',
          'CommandBar',
        ],
      },
      {
        id: 'AppBarToggleButton',
        title: 'AppBarToggleButton',
        subtitle: 'A button that can be on, off, or indeterminate like a CheckBox, and is styled for use in an app bar or other specialized UI.',
        description: 'An AppBarToggleButton looks like an AppBarButton, but works like a CheckBox. It typically has two states, checked (on) or unchecked (off), but can be indeterminate if the IsThreeState property is true. You can determine it\'s state by checking the IsChecked property.',
        tags: [
          'toolbar toggle',
          'command toggle',
        ],
        docs: [
          {
            title: 'AppBarToggleButton - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.appbartogglebutton',
          },
          {
            title: 'SymbolIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.symbolicon',
          },
          {
            title: 'FontIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.fonticon',
          },
          {
            title: 'BitmapIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.bitmapicon',
          },
          {
            title: 'PathIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.pathicon',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/command-bar',
          },
        ],
        image: 'AppBarToggleButton.png',
        related: [
          'AppBarButton',
          'AppBarSeparator',
          'CommandBar',
        ],
      },
      {
        id: 'CommandBar',
        title: 'CommandBar',
        subtitle: 'A toolbar for displaying application-specific commands that handles layout and resizing of its contents.',
        description: 'Command bars provide users with easy access to your app\'s most common tasks. Command bars can provide access to app-level or page-specific commands and can be used with any navigation pattern. By default, the command bar shows a row of icon buttons and an optional "see more" button, which is represented by an ellipsis [...].',
        tags: [
          'toolbar',
          'commands',
          'app bar',
        ],
        docs: [
          {
            title: 'CommandBar - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.commandbar',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/command-bar',
          },
        ],
        image: 'CommandBar.png',
        related: [
          'AppBarButton',
          'AppBarToggleButton',
          'AppBarSeparator',
        ],
      },
      {
        id: 'CommandBarFlyout',
        title: 'CommandBarFlyout',
        subtitle: 'A mini-toolbar displaying proactive commands, and an optional menu of commands.',
        description: 'A mini-toolbar which displays a set of proactive commands, as well as a secondary menu of commands if desired.',
        tags: [
          'context menu',
          'toolbar flyout',
          'commands',
        ],
        docs: [
          {
            title: 'CommandBarFlyout - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.commandbarflyout',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/command-bar-flyout',
          },
        ],
        image: 'CommandBarFlyout.png',
        related: [
          'CommandBar',
          'MenuFlyout',
          'RichEditBox',
          'TextBox',
          'StandardUICommand',
          'XamlUICommand',
        ],
      },
      {
        id: 'MenuBar',
        title: 'MenuBar',
        subtitle: 'A classic menu, allowing the display of MenuItems containing MenuFlyoutItems.',
        description: 'The Menubar simplifies the creation of basic applications by providing a set of menus at the top of the app or window.',
        tags: [
          'MenuBarItem',
          'application menu',
        ],
        docs: [
          {
            title: 'MenuBar - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Controls.MenuBar',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/menus',
          },
        ],
        image: 'MenuBar.png',
        related: [
          'CommandBar',
          'MenuFlyout',
          'StandardUICommand',
          'XamlUICommand',
        ],
      },
      {
        id: 'MenuFlyout',
        title: 'MenuFlyout',
        subtitle: 'Shows a contextual list of simple commands or options.',
        description: 'A MenuFlyout displays lightweight UI that is light dismissed by clicking or tapping off of it. Use it to let the user choose from a contextual list of simple commands or options.',
        tags: [
          'context menu',
          'right click menu',
          'MenuFlyoutItem',
          'dropdown menu',
        ],
        docs: [
          {
            title: 'MenuFlyout - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.menuflyout',
          },
          {
            title: 'MenuFlyoutItem - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.menuflyoutitem',
          },
          {
            title: 'MenuFlyoutSubItem - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.menuflyoutsubitem',
          },
          {
            title: 'MenuFlyoutSeparator - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.menuflyoutseparator',
          },
          {
            title: 'ToggleMenuFlyoutItem - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.togglemenuflyoutitem',
          },
          {
            title: 'RadioMenuFlyoutItem - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.radiomenuflyoutitem',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/menus',
          },
        ],
        image: 'MenuFlyout.png',
        related: [
          'Flyout',
          'ContentDialog',
          'Button',
          'AppBarButton',
        ],
      },
      {
        id: 'SwipeControl',
        title: 'SwipeControl',
        subtitle: 'Touch gesture for quick menu actions on items.',
        description: 'Touch gesture for quick menu actions on items.',
        tags: [
          'SwipeItem',
          'gesture',
        ],
        docs: [
          {
            title: 'SwipeControl - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.swipecontrol',
          },
          {
            title: 'SwipeItems - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.swipeitems',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/swipe',
          },
          {
            title: 'Gesture Actions',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/collection-commanding',
          },
        ],
        image: 'SwipeControl.png',
        related: [
          'GridView',
          'ListView',
        ],
      },
      {
        id: 'StandardUICommand',
        title: 'StandardUICommand',
        subtitle: 'A StandardUICommand is a built-in \'XamlUICommand\' which represents a commonly used command, e.g. \'Save\'.',
        description: 'StandardUICommands are a set of built-in XamlUICommands represeting commonly used commands. Including the look and feel of a given command, which can be reused across your app, and which is understood natively by the standard XAML controls. E.g. Save, Open, Copy, Paste, etc.',
        tags: [
          'standard command',
        ],
        docs: [
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/commanding#command-experiences-using-the-standarduicommand-class',
          },
          {
            title: 'StandardUICommand - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.input.standarduicommand',
          },
        ],
        image: 'AppBarSeparator.png',
        related: [
          'XamlUICommand',
          'AppBarButton',
          'AppBarToggleButton',
          'CommandBar',
        ],
      },
      {
        id: 'XamlUICommand',
        title: 'XamlUICommand',
        subtitle: 'An object which is used to define the look and feel of a given command.',
        description: 'An object which is used to define the look and feel of a given command, which can be reused across your app, and which is understood natively by the standard XAML controls.',
        tags: [],
        docs: [
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/commanding#command-experiences-using-the-xamluicommand-class',
          },
          {
            title: 'XamlUICommand - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.input.xamluicommand',
          },
        ],
        image: 'AppBarSeparator.png',
        related: [
          'StandardUICommand',
          'AppBarButton',
          'AppBarToggleButton',
          'CommandBar',
        ],
      },
    ],
  },
  {
    id: 'Collections',
    title: 'Collections',
    isSpecialSection: false,
    items: [
      {
        id: 'FlipView',
        title: 'FlipView',
        subtitle: 'Presents a collection of items that the user can flip through, one item at a time.',
        description: 'The FlipView lets you flip through a collection of items, one at a time. It\'s great for displaying images from a gallery, pages of a magazine, or similar items.',
        tags: [
          'carousel',
          'slideshow',
          'gallery',
        ],
        docs: [
          {
            title: 'FlipView - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.flipview',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/flipview',
          },
        ],
        image: 'FlipView.png',
        related: [
          'GridView',
          'ListView',
          'SemanticZoom',
        ],
      },
      {
        id: 'GridView',
        title: 'GridView',
        subtitle: 'A control that presents a collection of items in rows and columns.',
        description: 'The GridView lets you show a collection of items arranged in rows and columns that scroll horizontally.',
        tags: [
          'tiles',
          'collection grid',
        ],
        docs: [
          {
            title: 'GridView - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.gridview',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/lists',
          },
        ],
        image: 'GridView.png',
        related: [
          'ItemsView',
          'ListView',
          'FlipView',
          'SemanticZoom',
        ],
      },
      {
        id: 'ItemsRepeater',
        title: 'ItemsRepeater',
        subtitle: 'A flexible, primitive control for data-driven layouts.',
        description: 'The ItemsRepeater is like a markup-based loop that supports virtualization.',
        tags: [
          'data layout',
          'virtualization',
        ],
        docs: [
          {
            title: 'ItemsRepeater - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.itemsrepeater',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/items-repeater',
          },
          {
            title: 'StackLayout - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.stacklayout',
          },
          {
            title: 'UniformGridLayout - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.uniformgridlayout',
          },
        ],
        image: 'ListView.png',
        related: [
          'ItemsView',
          'ScrollView',
          'ScrollViewer',
          'ListView',
          'GridView',
        ],
      },
      {
        id: 'ItemsView',
        title: 'ItemsView',
        subtitle: 'A control that presents a collection of items using various layouts.',
        description: 'The ItemsView lets you show a collection of items using scrollable & swappable layouts.',
        tags: [
          'collection',
          'items source',
          'layout',
        ],
        docs: [
          {
            title: 'ItemsView - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.itemsview',
          },
          {
            title: 'CollectionViewSource - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Data.CollectionViewSource',
          },
        ],
        image: 'ItemsView.png',
        related: [
          'AnnotatedScrollBar',
          'ItemsRepeater',
          'ListView',
          'GridView',
          'ScrollView',
        ],
      },
      {
        id: 'ListBox',
        title: 'ListBox',
        subtitle: 'A control that presents a simple list of items the user can select from.',
        description: 'The ListBox lets you show a simple, non-virtualized list of selectable items. It is the plain sibling of ListView: use it for short, static lists where the plainer item visuals and the built-in chrome background are enough.',
        tags: [
          'list',
          'selection',
          'collection list',
        ],
        docs: [
          {
            title: 'ListBox - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.listbox',
          },
        ],
        image: 'ListView.png',
        related: [
          'ListView',
          'GridView',
          'ItemsView',
          'FlipView',
        ],
      },
      {
        id: 'ListView',
        title: 'ListView',
        subtitle: 'A control that presents a collection of items in a vertical list.',
        description: 'The ListView lets you show a collection of items in a list that scrolls vertically.',
        tags: [
          'list',
          'selection',
          'collection list',
        ],
        docs: [
          {
            title: 'ListView - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.listview',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/listview-and-gridview',
          },
          {
            title: 'Drag and Drop - Full Sample',
            uri: 'https://github.com/microsoft/Windows-universal-samples/tree/master/Samples/XamlDragAndDrop',
          },
          {
            title: 'CollectionViewSource - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Data.CollectionViewSource',
          },
          {
            title: 'Filtering collections and lists through user input',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/listview-filtering',
          },
          {
            title: 'Inverted Lists',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/inverted-lists',
          },
          {
            title: 'Inverted Lists - Full Sample',
            uri: 'https://github.com/Microsoft/Windows-universal-samples/tree/master/Samples/XamlBottomUpList',
          },
        ],
        image: 'ListView.png',
        related: [
          'ItemsView',
          'GridView',
          'StandardUICommand',
          'FlipView',
          'SemanticZoom',
        ],
      },
      {
        id: 'PullToRefresh',
        title: 'PullToRefresh',
        subtitle: 'Provides the ability to pull on a collection of items in a list/grid to refresh the contents of the collection.',
        description: 'PullToRefresh lets a user pull down on a list of data using touch in order to retrieve more data. PullToRefresh is widely used on devices with a touch screen.',
        tags: [
          'pull to refresh',
          'RefreshContainer',
          'RefreshVisualizer',
        ],
        docs: [
          {
            title: 'RefreshContainer - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Controls.RefreshContainer',
          },
          {
            title: 'RefreshVisualizer - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Controls.RefreshVisualizer',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/pull-to-refresh',
          },
        ],
        image: 'PullToRefresh.png',
        related: [
          'ScrollView',
          'ScrollViewer',
          'ListView',
        ],
      },
      {
        id: 'TreeView',
        title: 'TreeView',
        subtitle: 'The  TreeView control is a hierarchical list pattern with expanding and collapsing nodes that contain nested items.',
        description: 'The TreeView control is a hierarchical list pattern with expanding and collapsing nodes that contain nested items. ',
        tags: [
          'tree',
          'hierarchy',
          'nodes',
          'expandable list',
        ],
        docs: [
          {
            title: 'TreeView - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Controls.TreeView',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/tree-view',
          },
        ],
        image: 'TreeView.png',
        related: [
          'ListView',
          'ItemsRepeater',
        ],
      },
    ],
  },
  {
    id: 'DateAndTime',
    title: 'Date & time',
    isSpecialSection: false,
    items: [
      {
        id: 'CalendarDatePicker',
        title: 'CalendarDatePicker',
        subtitle: 'A control that lets users pick a date value using a calendar.',
        description: 'A control that lets users pick a date value using a calendar.',
        tags: [
          'date picker',
        ],
        docs: [
          {
            title: 'CalendarDatePicker - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.calendardatepicker',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/calendar-date-picker',
          },
        ],
        image: 'CalendarDatePicker.png',
        related: [
          'DatePicker',
          'CalendarView',
        ],
      },
      {
        id: 'CalendarView',
        title: 'CalendarView',
        subtitle: 'A control that presents a calendar for a user to choose a date from.',
        description: 'CalendarView shows a larger view for showing and selecting dates.  DatePicker by contrast has a compact view with inline selection.',
        tags: [
          'date',
          'month view',
        ],
        docs: [
          {
            title: 'CalendarView - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.calendarview',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/calendar-view',
          },
        ],
        image: 'CalendarView.png',
        related: [
          'CalendarDatePicker',
          'DatePicker',
          'TimePicker',
        ],
      },
      {
        id: 'DatePicker',
        title: 'DatePicker',
        subtitle: 'A control that lets a user pick a date value.',
        description: 'Use a DatePicker to let users set a date in your app, for example to schedule an appointment. The DatePicker displays three controls for month, date, and year. These controls are easy to use with touch or mouse, and they can be styled and configured in several different ways.',
        tags: [
          'date selection',
        ],
        docs: [
          {
            title: 'DatePicker - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.datepicker',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/date-picker',
          },
        ],
        image: 'DatePicker.png',
        related: [
          'CalendarDatePicker',
          'CalendarView',
          'TimePicker',
        ],
      },
      {
        id: 'TimePicker',
        title: 'TimePicker',
        subtitle: 'A configurable control that lets a user pick a time value.',
        description: 'Use a TimePicker to let users set a time in your app, for example to set a reminder. The TimePicker displays three controls for hour, minute, and AM/PM. These controls are easy to use with touch or mouse, and they can be styled and configured in several different ways.',
        tags: [
          'clock',
          'time selection',
        ],
        docs: [
          {
            title: 'TimePicker - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.timepicker',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/time-picker',
          },
        ],
        image: 'TimePicker.png',
        related: [
          'DatePicker',
          'CalendarView',
        ],
      },
    ],
  },
  {
    id: 'BasicInput',
    title: 'Basic input',
    isSpecialSection: false,
    items: [
      {
        id: 'Button',
        title: 'Button',
        subtitle: 'A control that responds to user input and raises a Click event.',
        description: 'The Button control provides a Click event to respond to user input from a touch, mouse, keyboard, stylus, or other input device. You can put different kinds of content in a button, such as text or an image, or you can restyle a button to give it a new look.',
        tags: [
          'click',
          'push button',
          'command',
        ],
        docs: [
          {
            title: 'Button - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.button',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/buttons',
          },
        ],
        image: 'Button.png',
        related: [
          'ToggleButton',
          'RepeatButton',
          'HyperlinkButton',
          'AppBarButton',
        ],
      },
      {
        id: 'DropDownButton',
        title: 'DropDownButton',
        subtitle: 'A button that displays a flyout of choices when clicked.',
        description: 'A control that drops down a flyout of choices from which one can be chosen.',
        tags: [
          'flyout button',
          'menu button',
        ],
        docs: [
          {
            title: 'DropDownButton - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.dropdownbutton',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/buttons',
          },
        ],
        image: 'DropDownButton.png',
        related: [
          'SplitButton',
          'ToggleSplitButton',
          'ToggleButton',
          'RepeatButton',
          'HyperlinkButton',
          'AppBarButton',
          'CommandBar',
        ],
      },
      {
        id: 'HyperlinkButton',
        title: 'HyperlinkButton',
        subtitle: 'A button that appears as hyperlink text, and can navigate to a URI or handle a Click event.',
        description: 'A HyperlinkButton appears as a text hyperlink. When a user clicks it, it opens the page you specify in the NavigateUri property in the default browser. Or you can handle its Click event, typically to navigate within your app.',
        tags: [
          'URL',
          'navigate',
        ],
        docs: [
          {
            title: 'HyperlinkButton - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.hyperlinkbutton',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/hyperlinks',
          },
        ],
        image: 'HyperlinkButton.png',
        related: [
          'Button',
          'ToggleButton',
          'RepeatButton',
          'AppBarButton',
        ],
      },
      {
        id: 'RepeatButton',
        title: 'RepeatButton',
        subtitle: 'A button that raises its Click event repeatedly from the time it\'s pressed until it\'s released.',
        description: 'The RepeatButton control is like a standard Button, except that the Click event occurs continuously while the user presses the RepeatButton.',
        tags: [
          'hold button',
        ],
        docs: [
          {
            title: 'RepeatButton - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.primitives.repeatbutton',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/buttons',
          },
        ],
        image: 'RepeatButton.png',
        related: [
          'Button',
          'ToggleButton',
          'HyperlinkButton',
          'AppBarButton',
        ],
      },
      {
        id: 'ToggleButton',
        title: 'ToggleButton',
        subtitle: 'A button that can be switched between two states like a CheckBox.',
        description: 'A ToggleButton looks like a Button, but works like a CheckBox. It typically has two states, checked (on) or unchecked (off), but can be indeterminate if the IsThreeState property is true. You can determine it\'s state by checking the IsChecked property.',
        tags: [
          'on off',
        ],
        docs: [
          {
            title: 'ToggleButton - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.primitives.togglebutton',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/buttons#create-a-toggle-split-button',
          },
        ],
        image: 'ToggleButton.png',
        related: [
          'Button',
          'AppBarToggleButton',
          'ToggleSwitch',
          'CheckBox',
          'CommandBarFlyout',
          'CommandBar',
        ],
      },
      {
        id: 'SplitButton',
        title: 'SplitButton',
        subtitle: 'A two-part button that displays a flyout when its secondary part is clicked.',
        description: 'The SplitButton is a dropdown button, but with an addition execution hit target.',
        tags: [
          'split',
          'dropdown button',
        ],
        docs: [
          {
            title: 'SplitButton - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.splitbutton',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/buttons#create-a-split-button',
          },
        ],
        image: 'SplitButton.png',
        related: [
          'Button',
          'DropDownButton',
          'ToggleSplitButton',
          'AppBarButton',
          'CommandBar',
        ],
      },
      {
        id: 'ToggleSplitButton',
        title: 'ToggleSplitButton',
        subtitle: 'A version of the SplitButton where the activation target toggles on/off.',
        description: 'A version of the SplitButton where the activation target toggles on/off.',
        tags: [
          'toggle split',
          'dropdown toggle',
        ],
        docs: [
          {
            title: 'ToggleSplitButton - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.togglesplitbutton',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/buttons',
          },
        ],
        image: 'ToggleSplitButton.png',
        related: [
          'SplitButton',
          'DropDownButton',
          'Button',
          'ToggleButton',
          'ToggleSwitch',
          'CheckBox',
        ],
      },
      {
        id: 'CheckBox',
        title: 'CheckBox',
        subtitle: 'A control that a user can select or clear.',
        description: 'CheckBox controls let the user select a combination of binary options. In contrast, RadioButton controls allow the user to select from mutually exclusive options. The indeterminate state is used to indicate that an option is set for some, but not all, child options. Don\'t allow users to set an indeterminate state directly to indicate a third option.',
        tags: [
          'tick',
          'three state',
          'checkmark',
        ],
        docs: [
          {
            title: 'CheckBox - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.checkbox',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/checkbox',
          },
        ],
        image: 'CheckBox.png',
        related: [
          'RadioButton',
          'ToggleSwitch',
          'ToggleButton',
        ],
      },
      {
        id: 'ColorPicker',
        title: 'ColorPicker',
        subtitle: 'A control that displays a selectable color spectrum.',
        description: 'A selectable color spectrum.',
        tags: [
          'color spectrum',
          'color wheel',
          'RGB',
          'hex',
        ],
        docs: [
          {
            title: 'ColorPicker - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Controls.ColorPicker',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/color-picker',
          },
        ],
        image: 'ColorPicker.png',
        related: [
          'ComboBox',
        ],
      },
      {
        id: 'ComboBox',
        title: 'ComboBox',
        subtitle: 'A drop-down list of items a user can select from.',
        description: 'Use a ComboBox when you need to conserve on-screen space and when users select only one option at a time. A ComboBox shows only the currently selected item.',
        tags: [
          'dropdown',
          'select',
          'picker',
        ],
        docs: [
          {
            title: 'ComboBox - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.combobox',
          },
          {
            title: 'ComboBoxItem - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.comboboxitem',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/combo-box',
          },
        ],
        image: 'ComboBox.png',
        related: [
          'RadioButton',
          'CheckBox',
          'ListView',
          'AutoSuggestBox',
          'RatingControl',
        ],
      },
      {
        id: 'RadioButton',
        title: 'RadioButton',
        subtitle: 'A control that allows a user to select a single option from a group of options.',
        description: 'Use RadioButton controls to let a user choose between mutually exclusive, related options. Generally contained within a RadioButtons group control.',
        tags: [
          'RadioButtons',
          'single selection',
          'option',
        ],
        docs: [
          {
            title: 'RadioButton - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.radiobutton',
          },
          {
            title: 'RadioButtons - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.radiobuttons',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/radio-button',
          },
        ],
        image: 'RadioButton.png',
        related: [
          'CheckBox',
          'ToggleSwitch',
          'ToggleButton',
        ],
      },
      {
        id: 'RatingControl',
        title: 'RatingControl',
        subtitle: 'Rate something 1 to 5 stars.',
        description: 'Rate something 1 to 5 stars.',
        tags: [
          'stars',
          'review',
        ],
        docs: [
          {
            title: 'RatingControl - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Controls.RatingControl',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/rating',
          },
        ],
        image: 'RatingControl.png',
        related: [
          'Slider',
          'ComboBox',
        ],
      },
      {
        id: 'Slider',
        title: 'Slider',
        subtitle: 'A control that lets the user select from a range of values by moving a Thumb control along a track.',
        description: 'Use a Slider when you want your users to be able to set defined, contiguous values (such as volume or brightness) or a range of discrete values (such as screen resolution settings).',
        tags: [
          'range',
          'track',
          'Thumb',
        ],
        docs: [
          {
            title: 'Slider - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.slider',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/slider',
          },
        ],
        image: 'Slider.png',
        related: [
          'ComboBox',
          'RatingControl',
        ],
      },
      {
        id: 'ToggleSwitch',
        title: 'ToggleSwitch',
        subtitle: 'A switch that can be toggled between 2 states.',
        description: 'Use ToggleSwitch controls to present users with exactly two mutually exclusive options (like on/off), where choosing an option results in an immediate commit. A toggle switch should have a single label.',
        tags: [
          'on off',
        ],
        docs: [
          {
            title: 'ToggleSwitch - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.toggleswitch',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/toggles',
          },
        ],
        image: 'ToggleSwitch.png',
        related: [
          'ToggleButton',
          'RadioButton',
          'CheckBox',
          'AppBarToggleButton',
        ],
      },
    ],
  },
  {
    id: 'StatusAndInfo',
    title: 'Status & info',
    isSpecialSection: false,
    items: [
      {
        id: 'InfoBadge',
        title: 'InfoBadge',
        subtitle: 'An non-intrusive UI to display notifications or bring focus to an area.',
        description: 'Badging is a non-intrusive and intuitive way to display notifications or bring focus to an area within an app - whether that be for notifications, indicating new content, or showing an alert.',
        tags: [
          'notification dot',
          'count badge',
        ],
        docs: [
          {
            title: 'InfoBadge - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.infobadge',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/info-badge',
          },
        ],
        image: 'InfoBadge.png',
        related: [
          'InfoBar',
          'TeachingTip',
          'BadgeNotificationManager',
        ],
      },
      {
        id: 'InfoBar',
        title: 'InfoBar',
        subtitle: 'An inline message to display app-wide status change information.',
        description: 'Use an InfoBar control when a user should be informed of, acknowledge, or take action on a changed application state. By default the notification will remain in the content area until closed by the user but will not necessarily break user flow.',
        tags: [
          'notification',
          'status message',
          'alert',
          'banner',
        ],
        docs: [
          {
            title: 'InfoBar - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.infobar',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/infobar',
          },
        ],
        image: 'InfoBar.png',
        related: [
          'TeachingTip',
          'ContentDialog',
        ],
      },
      {
        id: 'ProgressBar',
        title: 'ProgressBar',
        subtitle: 'Shows the apps progress on a task, or that the app is performing ongoing work that doesn\'t block user interaction.',
        description: 'The ProgressBar has two different visual representations:\nIndeterminate - shows that a task is ongoing, but doesn\'t block user interaction.\nDeterminate - shows how much progress has been made on a known amount of work.',
        tags: [
          'loading',
          'determinate',
          'indeterminate',
        ],
        docs: [
          {
            title: 'ProgressBar - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Controls.ProgressBar',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/progress-controls',
          },
        ],
        image: 'ProgressBar.png',
        related: [
          'ProgressRing',
        ],
      },
      {
        id: 'ProgressRing',
        title: 'ProgressRing',
        subtitle: 'Shows the apps progress on a task, or that the app is performing ongoing work that does block user interaction.',
        description: 'The ProgressRing has two different visual representations:\nIndeterminate - shows that a task is ongoing, but blocks user interaction.\nDeterminate - shows how much progress has been made on a known amount of work.',
        tags: [
          'loading',
          'spinner',
          'busy',
        ],
        docs: [
          {
            title: 'ProgressRing - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.progressring',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/progress-controls',
          },
        ],
        image: 'ProgressRing.png',
        related: [
          'ProgressBar',
        ],
      },
      {
        id: 'ToolTip',
        title: 'ToolTip',
        subtitle: 'Displays information for an element in a pop-up window.',
        description: 'A ToolTip shows more information about a UI element. You might show information about what the element does, or what the user should do. The ToolTip is shown when a user hovers over or presses and holds the UI element.',
        tags: [
          'hint',
          'hover text',
        ],
        docs: [
          {
            title: 'ToolTip - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.tooltip',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/tooltips',
          },
        ],
        image: 'ToolTip.png',
        related: [
          'TeachingTip',
          'Flyout',
          'ContentDialog',
        ],
      },
    ],
  },
  {
    id: 'DialogsAndFlyouts',
    title: 'Dialogs & flyouts',
    isSpecialSection: false,
    items: [
      {
        id: 'ContentDialog',
        title: 'ContentDialog',
        subtitle: 'A dialog box that can be customized to contain any XAML content.',
        description: 'Use a ContentDialog to show relevant information or to provide a modal dialog experience that can show any XAML content.',
        tags: [
          'modal',
          'popup dialog',
          'message box',
        ],
        docs: [
          {
            title: 'ContentDialog - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.contentdialog',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/dialogs-and-flyouts/dialogs',
          },
        ],
        image: 'ContentDialog.png',
        related: [
          'Flyout',
          'MenuFlyout',
          'TeachingTip',
          'ToolTip',
        ],
      },
      {
        id: 'Flyout',
        title: 'Flyout',
        subtitle: 'Shows contextual information and enables user interaction.',
        description: 'A Flyout displays lightweight UI that is either information, or requires user interaction. Unlike a dialog, a Flyout can be light dismissed by clicking or tapping off of it. Use it to collect input from the user, show more details about an item, or ask the user to confirm an action.',
        tags: [
          'popup',
          'contextual',
        ],
        docs: [
          {
            title: 'Flyout - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.flyout',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/dialogs-and-flyouts',
          },
        ],
        image: 'Flyout.png',
        related: [
          'TeachingTip',
          'ContentDialog',
          'MenuFlyout',
          'Button',
          'AppBarButton',
        ],
      },
      {
        id: 'Popup',
        title: 'Popup',
        subtitle: 'A UI element displaying temporary content over existing interface.',
        description: 'The Popup Control allows your app to display temporary content above other UI elements. It can be used for lightweight interactions such as tooltips, notifications, or custom floating panels to enhance user workflows or highlight specific parts of the interface.',
        tags: [
          'overlay',
          'temporary content',
        ],
        docs: [
          {
            title: 'Popup - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.primitives.popup',
          },
        ],
        image: 'Popup.png',
        isNew: true,
        related: [
          'ContentDialog',
        ],
      },
      {
        id: 'TeachingTip',
        title: 'TeachingTip',
        subtitle: 'A content-rich flyout for guiding users and enabling teaching moments.',
        description: 'The XAML TeachingTip Control provides a way for your app to guide and inform users in your application with a non-invasive and content rich notification. TeachingTip can be used for bringing focus to a new or important feature, teaching users how to perform a task, or enhancing the user workflow by providing contextually relevant information to their task at hand.',
        tags: [
          'callout',
          'coachmark',
        ],
        docs: [
          {
            title: 'TeachingTip - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.teachingtip',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/dialogs-and-flyouts/teaching-tip',
          },
        ],
        image: 'TeachingTip.png',
        related: [
          'ContentDialog',
          'Flyout',
          'ToolTip',
        ],
      },
    ],
  },
  {
    id: 'Scrolling',
    title: 'Scrolling',
    isSpecialSection: false,
    items: [
      {
        id: 'AnnotatedScrollBar',
        title: 'AnnotatedScrollBar',
        subtitle: 'A control that extends a regular vertical scrollbar\'s functionality for an easy navigation through large collections.',
        description: 'The AnnotatedScrollBar lets you navigate through a large collection of items via a clickable rail with labels which act as markers.',
        tags: [
          'annotated scroll',
          'navigation',
        ],
        docs: [
          {
            title: 'AnnotatedScrollBar - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.annotatedscrollbar',
          },
        ],
        image: 'AnnotatedScrollbar.png',
        related: [
          'ItemsView',
          'ScrollView',
        ],
      },
      {
        id: 'PipsPager',
        title: 'PipsPager',
        subtitle: 'A control to let the user navigate through a paginated collection when the page numbers do not need to be visually known.',
        description: 'A PipsPager allows the user to navigate through a paginated collection and is independent of the content shown. Use this control when the content in the layout is not explicitly ordered by relevancy or you desire a glyph-based representation of numbered pages. PipsPagers are commonly used in photo viewers, app lists, carousels, and when display space is limited.',
        tags: [
          'pagination',
          'dots',
        ],
        docs: [
          {
            title: 'PipsPager - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.pipspager',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/pipspager',
          },
        ],
        image: 'PipsPager.png',
        related: [
          'ScrollViewer',
          'FlipView',
          'ItemsRepeater',
        ],
      },
      {
        id: 'ScrollView',
        title: 'ScrollView',
        subtitle: 'A container control that lets the user pan and zoom its content.',
        description: 'A ScrollView lets a user scroll, pan, and zoom to see content that\'s larger than the viewable area. The ItemsView has a ScrollView built into its control template to provide automatic scrolling.',
        tags: [
          'pan',
          'zoom',
          'scrolling',
        ],
        docs: [
          {
            title: 'ScrollView - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.scrollview',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/scroll-controls',
          },
        ],
        image: 'ScrollView.png',
        related: [
          'Viewbox',
          'Canvas',
          'Grid',
          'StackPanel',
          'RelativePanel',
          'ParallaxView',
          'ItemsView',
          'ScrollViewer',
        ],
      },
      {
        id: 'ScrollViewer',
        title: 'ScrollViewer',
        subtitle: 'A container control that lets the user pan and zoom its content.',
        description: 'A ScrollViewer lets a user scroll, pan, and zoom to see content that\'s larger than the viewable area. Many content controls, like ListView, have ScrollViewers built into their control templates to provide automatic scrolling.',
        tags: [
          'pan',
          'zoom',
          'scrolling',
        ],
        docs: [
          {
            title: 'ScrollViewer - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.scrollviewer',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/scroll-controls',
          },
        ],
        image: 'ScrollViewer.png',
        related: [
          'Viewbox',
          'Canvas',
          'Grid',
          'StackPanel',
          'RelativePanel',
          'ParallaxView',
          'ScrollView',
        ],
      },
      {
        id: 'SemanticZoom',
        title: 'SemanticZoom',
        subtitle: 'Lets the user zoom between two different views of a collection, making it easier to navigate through large collections of items.',
        description: 'The SemanticZoom lets you show grouped data in two different ways, and is useful for quickly navigating through large sets of data.',
        tags: [
          'semantic zoom',
          'grouped view',
        ],
        docs: [
          {
            title: 'SemanticZoom - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.semanticzoom',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/semantic-zoom',
          },
        ],
        image: 'SemanticZoom.png',
        related: [
          'GridView',
          'ListView',
        ],
      },
    ],
  },
  {
    id: 'Layout',
    title: 'Layout',
    isSpecialSection: false,
    items: [
      {
        id: 'Border',
        title: 'Border',
        subtitle: 'A container control that draws a boundary line, background, or both, around another object.',
        description: 'Use a Border control to draw a boundary line, background, or both, around another object. A Border can contain only one child object.',
        tags: [
          'outline',
          'frame',
          'background',
        ],
        docs: [
          {
            title: 'Border - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.border',
          },
        ],
        image: 'Border.png',
        related: [
          'Canvas',
          'Grid',
          'StackPanel',
          'VariableSizedWrapGrid',
          'RelativePanel',
        ],
      },
      {
        id: 'Canvas',
        title: 'Canvas',
        subtitle: 'A layout panel that supports absolute positioning of child elements relative to the top left corner of the canvas.',
        description: 'The Canvas provides absolute positioning of controls or content. Content is positioned relative to the Canvas using the Canvas.Top and Canvas.Left attached properties.',
        tags: [
          'absolute position',
          'coordinates',
        ],
        docs: [
          {
            title: 'Canvas - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.canvas',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/layout/layout-panels',
          },
        ],
        image: 'Canvas.png',
        related: [
          'Border',
          'Grid',
          'StackPanel',
          'VariableSizedWrapGrid',
          'RelativePanel',
        ],
      },
      {
        id: 'Expander',
        title: 'Expander',
        subtitle: 'A container with a header that can be expanded to show a body with more content.',
        description: 'The Expander has a header and can expand to show a body with more content. Use an Expander when some content is only relevant some of the time (for example to read more information or access additional options for an item).',
        tags: [
          'collapse',
          'accordion',
        ],
        docs: [
          {
            title: 'Expander - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.expander',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/expander',
          },
        ],
        image: 'Expander.png',
        related: [
          'Flyout',
          'ItemsRepeater',
          'SplitView',
        ],
      },
      {
        id: 'Grid',
        title: 'Grid',
        subtitle: 'A layout panel that supports arranging child elements in rows and columns. ',
        description: 'The Grid is used to arrange controls and content in rows and columns. Content is positioned in the grid using Grid.Row and Grid.Column attached properties.',
        tags: [
          'rows',
          'columns',
        ],
        docs: [
          {
            title: 'Grid - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.grid',
          },
          {
            title: 'Tutorial',
            uri: 'https://learn.microsoft.com/windows/apps/design/layout/grid-tutorial',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/layout/layout-panels#grid',
          },
        ],
        image: 'Grid.png',
        related: [
          'Border',
          'Canvas',
          'StackPanel',
          'VariableSizedWrapGrid',
          'RelativePanel',
        ],
      },
      {
        id: 'RelativePanel',
        title: 'RelativePanel',
        subtitle: 'A panel that uses relationships between elements to define layout.',
        description: 'Use a RelativePanel to layout elements by defining the relationships between elements and in relation to the panel.',
        tags: [
          'relative layout',
          'positioning',
        ],
        docs: [
          {
            title: 'RelativePanel - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.relativepanel',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/layout/layout-panels',
          },
        ],
        image: 'RelativePanel.png',
        related: [
          'Grid',
          'StackPanel',
          'Border',
          'Canvas',
          'Viewbox',
        ],
      },
      {
        id: 'SplitView',
        title: 'SplitView',
        subtitle: 'A container that has 2 content areas, with multiple display options for the pane.',
        description: 'Use a SplitView to display content, such as navigation options, in a pane on the side. There are multiple options for displaying the pane, namely CompactOverlay, Compact, Overlay, Inline. If you are looking for a hamburger navigation pattern, check out the NavigationView sample.',
        tags: [
          'pane',
          'hamburger',
          'navigation pane',
        ],
        docs: [
          {
            title: 'SplitView - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.splitview',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/split-view',
          },
        ],
        image: 'SplitView.png',
        related: [
          'StackPanel',
          'ListView',
          'GridView',
          'Grid',
          'RelativePanel',
        ],
      },
      {
        id: 'StackPanel',
        title: 'StackPanel',
        subtitle: 'A layout panel that arranges child elements into a single line that can be oriented horizontally or vertically.',
        description: 'A StackPanel is used to arrange items in a line, either horizontally or vertically.',
        tags: [
          'stack',
          'vertical layout',
          'horizontal layout',
        ],
        docs: [
          {
            title: 'StackPanel - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.stackpanel',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/layout/layout-panels',
          },
        ],
        image: 'StackPanel.png',
        related: [
          'Border',
          'Canvas',
          'Grid',
          'VariableSizedWrapGrid',
          'RelativePanel',
        ],
      },
      {
        id: 'VariableSizedWrapGrid',
        title: 'VariableSizedWrapGrid',
        subtitle: 'A layout panel that supports arranging child elements in rows and columns. Each child element can span multiple rows and columns.',
        description: 'A VariableSizedWrapGrip is used to create grid layouts where content can span multiple rows and columns.',
        tags: [
          'wrap grid',
          'tiles',
          'spanning',
        ],
        docs: [
          {
            title: 'VariableSizedWrapGrid - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.variablesizedwrapgrid',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/layout/layout-panels',
          },
        ],
        image: 'VariableSizedWrapGrid.png',
        related: [
          'Border',
          'Canvas',
          'Grid',
          'StackPanel',
          'RelativePanel',
        ],
      },
      {
        id: 'Viewbox',
        title: 'Viewbox',
        subtitle: 'A container control that scales its content to a specified size.',
        description: 'Use a Viewbox control scale content up or down to a specified size.',
        tags: [
          'scale',
          'stretch',
          'zoom content',
        ],
        docs: [
          {
            title: 'Viewbox - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.Viewbox',
          },
        ],
        image: 'Viewbox.png',
        related: [
          'ScrollViewer',
          'Canvas',
          'Grid',
          'StackPanel',
          'RelativePanel',
        ],
      },
    ],
  },
  {
    id: 'Navigation',
    title: 'Navigation',
    isSpecialSection: false,
    items: [
      {
        id: 'BreadcrumbBar',
        title: 'BreadcrumbBar',
        subtitle: 'Shows the trail of navigation taken to the current location.',
        description: 'The BreadcrumbBar control provides a common horizontal layout to display the trail of navigation taken to the current location. Resize to see the nodes crumble, starting at the root.',
        tags: [
          'navigation trail',
          'path',
        ],
        docs: [
          {
            title: 'BreadcrumbBar - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.breadcrumbbar',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/breadcrumbbar',
          },
        ],
        image: 'BreadcrumbBar.png',
        related: [
          'NavigationView',
          'Pivot',
          'TabView',
        ],
      },
      {
        id: 'NavigationView',
        title: 'NavigationView',
        subtitle: 'Common vertical layout for top-level areas of your app via a collapsible navigation menu.',
        description: 'The NavigationView control provides a common vertical layout for top-level areas of your app via a collapsible navigation menu.',
        tags: [
          'hamburger menu',
          'side nav',
          'nav pane',
        ],
        docs: [
          {
            title: 'NavigationView - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Controls.NavigationView',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/navigationview',
          },
        ],
        image: 'NavigationView.png',
        related: [
          'SplitView',
          'Pivot',
        ],
      },
      {
        id: 'Pivot',
        title: 'Pivot',
        subtitle: 'Presents information from different sources in a tabbed view.',
        description: 'Pivot is not recommended for Windows 11 design patterns. Please use the SelectorBar and SelectorBarItem. A Pivot allows you to show a collection of items from different sources in a tabbed view.',
        tags: [
          'tabs',
          'tabbed view',
        ],
        docs: [
          {
            title: 'Pivot - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.pivot',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/pivot',
          },
        ],
        image: 'Pivot.png',
        related: [
          'SelectorBar',
        ],
      },
      {
        id: 'SelectorBar',
        title: 'SelectorBar',
        subtitle: 'Presents information from a small set of different sources. The user can pick one of them.',
        description: 'SelectorBar is used to modify the content shown by allowing users to select and switch between a small, finite set of data.',
        tags: [
          'segmented',
          'tabs',
        ],
        docs: [
          {
            title: 'SelectorBar - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.selectorbar',
          },
          {
            title: 'SelectorBarItem - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.selectorbaritem',
          },
        ],
        image: 'Pivot.png',
        isNew: true,
        related: [
          'NavigationView',
          'PipsPager',
          'Pivot',
        ],
      },
      {
        id: 'TabView',
        title: 'TabView',
        subtitle: 'A control that displays a collection of tabs that can be used to display several documents.',
        description: 'TabView provides the user with a collection of tabs that can be used to display several documents.',
        tags: [
          'tabs',
          'tabbed',
          'tab control',
        ],
        docs: [
          {
            title: 'TabView - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.tabview',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/tab-view',
          },
          {
            title: 'Show multiple views for an app',
            uri: 'https://learn.microsoft.com/windows/apps/design/layout/show-multiple-views',
          },
        ],
        image: 'TabView.png',
        related: [
          'Pivot',
          'NavigationView',
          'ListView',
        ],
      },
    ],
  },
  {
    id: 'Media',
    title: 'Media',
    isSpecialSection: false,
    items: [
      {
        id: 'AnimatedVisualPlayer',
        title: 'AnimatedVisualPlayer',
        subtitle: 'An element to render and control playback of motion graphics.',
        description: 'An element to render and control playback of motion graphics.',
        tags: [
          'Lottie',
          'animation',
          'motion graphics',
        ],
        docs: [
          {
            title: 'AnimatedVisualPlayer - API',
            uri: 'https://learn.microsoft.com/windows/winui/api/microsoft.ui.xaml.controls.animatedvisualplayer',
          },
          {
            title: 'Full Samples',
            uri: 'ms-windows-store://pdp/?productid=9N3J5TG8FF7F',
          },
          {
            title: 'Tutorials',
            uri: 'https://learn.microsoft.com/windows/communitytoolkit/animations/lottie#tutorials',
          },
          {
            title: 'Lottie Overview',
            uri: 'https://learn.microsoft.com/windows/communitytoolkit/animations/lottie',
          },
          {
            title: 'Lottie Windows - GitHub',
            uri: 'https://github.com/CommunityToolkit/Lottie-Windows',
          },
        ],
        image: 'AnimatedVisualPlayer.png',
        related: [
          'AnimatedIcon',
        ],
      },
      {
        id: 'CaptureElementPreview',
        title: 'Capture Element / Camera Preview',
        subtitle: 'A sample for doing a camera preview.',
        description: 'You can use a MediaPlayerElement control to show a camera preview with a MediaCapture object.',
        tags: [
          'camera',
          'webcam',
        ],
        docs: [
          {
            title: 'MediaCapture - API',
            uri: 'https://learn.microsoft.com/uwp/api/windows.media.capture.mediacapture',
          },
        ],
        image: 'CaptureElement.png',
        isNew: true,
        related: [
          'MediaPlayerElement',
          'Image',
        ],
      },
      {
        id: 'Image',
        title: 'Image',
        subtitle: 'A control to display image content.',
        description: 'You can use an Image control to show and scale images.',
        tags: [
          'picture',
          'BitmapImage',
          'photo',
        ],
        docs: [
          {
            title: 'Image - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.image',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/images-imagebrushes',
          },
        ],
        image: 'Image.png',
        related: [
          'MediaPlayerElement',
          'PersonPicture',
        ],
      },
      {
        id: 'MapControl',
        title: 'MapControl',
        subtitle: 'Displays a symbolic map of the Earth.',
        description: 'Displays a symbolic map of the Earth',
        tags: [
          'maps',
          'geography',
          'location',
        ],
        docs: [
          {
            title: 'MapControl - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.mapcontrol',
          },
        ],
        image: 'MapControl.png',
        related: [],
      },
      {
        id: 'MediaPlayerElement',
        title: 'MediaPlayerElement',
        subtitle: 'A control to display video and image content.',
        description: 'You can use a MediaPlayerElement control to playback videos and show images. You can show transport controls or make the video autoplay.',
        tags: [
          'video',
          'media player',
          'audio',
          'playback',
        ],
        docs: [
          {
            title: 'MediaPlayerElement - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.MediaPlayerElement',
          },
          {
            title: 'Media Playback',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/media-playback',
          },
        ],
        image: 'MediaPlayerElement.png',
        related: [
          'Image',
          'CaptureElementPreview',
        ],
      },
      {
        id: 'PersonPicture',
        title: 'PersonPicture',
        subtitle: 'Displays the picture of a person/contact.',
        description: 'Displays the picture of a person/contact.',
        tags: [
          'avatar',
          'contact photo',
        ],
        docs: [
          {
            title: 'PersonPicture - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Controls.PersonPicture',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/person-picture',
          },
        ],
        image: 'PersonPicture.png',
        related: [
          'Image',
        ],
      },
      {
        id: 'Sound',
        title: 'Sound',
        subtitle: 'A code-behind only API that enables 2D and 3D UI sounds on all XAML controls.',
        description: 'Sound is enabled by default for UWP apps running on Xbox, but can be set to always play on all devices if desired. Sound may also be put into Spatial Audio mode for a more immersive 10ft experience.',
        tags: [
          'audio',
          'UI sound',
          'ElementSoundPlayer',
        ],
        docs: [
          {
            title: 'Sound - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.elementsoundplayer',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/style/sound',
          },
        ],
        image: 'Sound.png',
        related: [],
      },
      {
        id: 'WebView2',
        title: 'WebView2',
        subtitle: 'A Microsoft Edge (Chromium) based control that hosts HTML content in an app.',
        description: 'A Microsoft Edge (Chromium) based control that hosts HTML content in an app.',
        tags: [
          'browser',
          'HTML',
          'Edge',
          'web content',
        ],
        docs: [
          {
            title: 'WebView2 - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.webview2',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/microsoft-edge/webview2/gettingstarted/winui',
          },
          {
            title: 'Examples',
            uri: 'https://github.com/MicrosoftEdge/WebView2Samples',
          },
        ],
        image: 'WebView.png',
        related: [],
      },
    ],
  },
  {
    id: 'Styles',
    title: 'Styles',
    isSpecialSection: false,
    items: [
      {
        id: 'Acrylic',
        title: 'AcrylicBrush',
        subtitle: 'A translucent material recommended for panel backgrounds.',
        description: 'A translucent material recommended for panel backgrounds.',
        tags: [
          'acrylic',
          'material',
          'translucent',
          'blur',
          'AcrylicBrush',
        ],
        docs: [
          {
            title: 'AcrylicBrush - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.acrylicbrush',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/style/acrylic',
          },
        ],
        image: 'Acrylic.png',
        related: [
          'SystemBackdrops',
          'RadialGradientBrush',
          'ThemeShadow',
        ],
      },
      {
        id: 'AnimatedIcon',
        title: 'AnimatedIcon',
        subtitle: 'An element that displays and controls an icon that animates when the user interacts with the control.',
        description: 'An element that displays and controls an icon that animates when the user interacts with the control.',
        tags: [
          'animated icon',
          'icon animation',
          'Lottie icon',
        ],
        docs: [
          {
            title: 'AnimatedIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.animatedicon',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/animated-icon',
          },
          {
            title: 'Lottie Overview',
            uri: 'https://learn.microsoft.com/windows/communitytoolkit/animations/lottie',
          },
          {
            title: 'Lottie Windows - GitHub',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.animatedvisualplayer',
          },
        ],
        image: 'AnimatedIcon.png',
        related: [
          'AnimatedVisualPlayer',
          'IconElement',
        ],
      },
      {
        id: 'CompactSizing',
        title: 'Compact Sizing',
        subtitle: 'How to use a Resource Dictionary to enable compact sizing.',
        description: 'Enables the creation of compact, smaller apps by adding a style resource at the app, page or control level.',
        tags: [
          'density',
          'compact sizing',
        ],
        docs: [
          {
            title: 'Spacing',
            uri: 'https://learn.microsoft.com/windows/apps/design/style/spacing',
          },
        ],
        image: 'CompactSizing.png',
        related: [],
      },
      {
        id: 'IconElement',
        title: 'IconElement',
        subtitle: 'Represents icon controls that use different image types as its content.',
        description: 'Represents icon controls that use different image types as its content.',
        tags: [
          'BitmapIcon',
          'FontIcon',
          'PathIcon',
          'SymbolIcon',
          'ImageIcon',
          'AnimatedIcon',
        ],
        docs: [
          {
            title: 'BitmapIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.bitmapicon',
          },
          {
            title: 'FontIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.fonticon',
          },
          {
            title: 'ImageIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.imageicon',
          },
          {
            title: 'PathIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.pathicon',
          },
          {
            title: 'SymbolIcon - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.symbolicon',
          },
          {
            title: 'Icon Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/style/icons',
          },
        ],
        image: 'Image.png',
        related: [
          'AnimatedIcon',
          'AppBarButton',
        ],
      },
      {
        id: 'Line',
        title: 'Line',
        subtitle: 'Draws a straight line between two points.',
        description: 'Draws a straight line between two points.',
        tags: [
          'stroke',
          'draw line',
        ],
        docs: [
          {
            title: 'Lines - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.shapes',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/previous-versions/windows/apps/hh465055(v=win.10)',
          },
        ],
        image: 'Line.png',
        related: [
          'Shape',
        ],
      },
      {
        id: 'Shape',
        title: 'Shape',
        subtitle: 'How to draw shapes, such as ellipses, rectangles, and polygons.',
        description: 'Basic shapes are intended for decorative rendering or for compositing non-interactive parts of controls.',
        tags: [
          'shapes',
          'ellipse',
          'rectangle',
          'polygon',
          'path',
          'circle',
        ],
        docs: [
          {
            title: 'Shapes - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.shapes',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/previous-versions/windows/apps/hh465055(v=win.10)',
          },
        ],
        image: 'Shape.png',
        related: [
          'Line',
        ],
      },
      {
        id: 'RadialGradientBrush',
        title: 'RadialGradientBrush',
        subtitle: 'A brush to show radial gradients.',
        description: 'Paints an area with a radial gradient. A center point defines the beginning of the gradient, and a radius defines the end point of the gradient.',
        tags: [
          'gradient',
          'radial gradient',
          'brush',
        ],
        docs: [
          {
            title: 'RadialGradientBrush - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.RadialGradientBrush',
          },
        ],
        image: 'Canvas.png',
        related: [
          'Acrylic',
        ],
      },
      {
        id: 'SystemBackdrops',
        title: 'System Backdrops (Mica/Acrylic)',
        subtitle: 'System backdrops, like Mica and Acrylic, for app windows.',
        description: 'System backdrops apply a material effect to the window background. Mica is opaque and samples the desktop wallpaper; Desktop Acrylic is semi-transparent and shows a blurred view of what is behind the window. Available backdrop kinds: Mica, Mica Alt, Desktop Acrylic Base, and Desktop Acrylic Thin. Use the built-in MicaBackdrop or DesktopAcrylicBackdrop types for simplicity, or use MicaController / DesktopAcrylicController for full customization.',
        tags: [
          'Mica',
          'Acrylic',
          'window material',
        ],
        docs: [
          {
            title: 'SystemBackdrop - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.systembackdrop',
          },
          {
            title: 'MicaBackdrop - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.micabackdrop',
          },
          {
            title: 'DesktopAcrylicBackdrop - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.desktopacrylicbackdrop',
          },
          {
            title: 'MicaController - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.composition.systembackdrops.micacontroller',
          },
          {
            title: 'DesktopAcrylicController - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.composition.systembackdrops.desktopacryliccontroller',
          },
        ],
        image: 'Acrylic.png',
        related: [
          'Acrylic',
        ],
      },
      {
        id: 'SystemBackdropElement',
        title: 'SystemBackdropElement',
        subtitle: 'An element to host system backdrop materials.',
        description: 'SystemBackdropElement applies system backdrop materials (Mica and Acrylic) to specific areas inside the UI tree, extending these materials beyond the window background to enable more flexible and immersive designs.',
        tags: [
          'Mica',
          'Acrylic',
          'material',
        ],
        docs: [
          {
            title: 'SystemBackdropElement - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.systembackdropelement',
          },
        ],
        image: 'Acrylic.png',
        isNew: true,
        related: [],
      },
      {
        id: 'ThemeShadow',
        title: 'ThemeShadow',
        subtitle: 'Adds a depth-aware shadow to UI elements using system lighting.',
        description: 'Adds a realistic shadow effect to UI elements using the system\'s lighting and depth to enhance visual hierarchy.',
        tags: [
          'depth',
          'elevation',
        ],
        docs: [
          {
            title: 'Z-depth and shadow design guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/layout/depth-shadow',
          },
          {
            title: 'ThemeShadow - API',
            uri: 'https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.themeshadow',
          },
        ],
        image: 'ThemeShadow.png',
        isNew: true,
        related: [
          'Acrylic',
        ],
      },
    ],
  },
  {
    id: 'Text',
    title: 'Text',
    isSpecialSection: false,
    items: [
      {
        id: 'AutoSuggestBox',
        title: 'AutoSuggestBox',
        subtitle: 'A control to provide suggestions as a user is typing.',
        description: 'A text control that makes suggestions to users as they type. The app is notified when text has been changed by the user and is responsible for providing relevant suggestions for this control to display.',
        tags: [
          'search box',
          'autocomplete',
          'suggestions',
          'typeahead',
        ],
        docs: [
          {
            title: 'AutoSuggestBox - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.autosuggestbox',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/auto-suggest-box',
          },
        ],
        image: 'AutoSuggestBox.png',
        related: [
          'ComboBox',
          'TextBox',
        ],
      },
      {
        id: 'NumberBox',
        title: 'NumberBox',
        subtitle: 'A text control used for numeric input and evaluation of algebraic equations.',
        description: 'Use NumberBox to allow users to enter algebraic equations and numeric input in your app.',
        tags: [
          'numeric input',
          'spinner',
          'calculator',
        ],
        docs: [
          {
            title: 'NumberBox - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.numberbox',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/number-box',
          },
        ],
        image: 'NumberBox.png',
        related: [
          'TextBox',
          'TextBlock',
          'RichTextBlock',
          'RichEditBox',
        ],
      },
      {
        id: 'PasswordBox',
        title: 'PasswordBox',
        subtitle: 'A control for entering passwords.',
        description: 'A user can enter a single line of non-wrapping text in a PasswordBox control. The text is masked by characters that you can specify by using the PasswordChar property, and you can specify the maximum number of characters that the user can enter by setting the MaxLength property.',
        tags: [
          'secure input',
          'reveal',
        ],
        docs: [
          {
            title: 'PasswordBox - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.passwordbox',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/text-controls',
          },
        ],
        image: 'PasswordBox.png',
        related: [
          'TextBox',
          'TextBlock',
          'RichTextBlock',
          'RichEditBox',
        ],
      },
      {
        id: 'RichEditBox',
        title: 'RichEditBox',
        subtitle: 'A rich text editing control that supports formatted text, hyperlinks, and other rich content.',
        description: 'You can use a RichEditBox control to enter and edit rich text documents that contain formatted text, hyperlinks, and images. By default, the RichEditBox supports spell checking. You can make a RichEditBox read-only by setting its IsReadOnly property to true.',
        tags: [
          'rich text editor',
          'RTF',
          'formatted text',
          'editor',
        ],
        docs: [
          {
            title: 'RichEditBox - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.richeditbox',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/text-controls',
          },
        ],
        image: 'RichEditBox.png',
        related: [
          'NumberBox',
          'TextBox',
          'RichTextBlock',
          'TextBlock',
        ],
      },
      {
        id: 'RichTextBlock',
        title: 'RichTextBlock',
        subtitle: 'A control that displays formatted text, hyperlinks, inline images, and other rich content.',
        description: 'RichTextBlock provides more advanced formatting features than the TextBlock control. You can apply character and paragraph formatting to the text in the RichTextBlock. For example, you can apply Bold, Italic, and Underline to any portion of the text in the control. You can use linked text containers (a RichTextBlock linked to RichTextBlockOverflow elements) to create advanced page layouts.',
        tags: [
          'rich text',
          'formatted text',
          'inline content',
        ],
        docs: [
          {
            title: 'RichTextBlock - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.richtextblock',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/text-controls',
          },
        ],
        image: 'RichTextBlock.png',
        related: [
          'NumberBox',
          'TextBlock',
          'TextBox',
          'PasswordBox',
          'RichEditBox',
        ],
      },
      {
        id: 'TextBlock',
        title: 'TextBlock',
        subtitle: 'A lightweight control for displaying small amounts of text.',
        description: 'TextBlock is the primary control for displaying read-only text in your app. You typically display text by setting the Text property to a simple string. You can also display a series of strings in Run elements and give each different formatting.',
        tags: [
          'label',
          'display text',
        ],
        docs: [
          {
            title: 'TextBlock - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.textblock',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/text-controls',
          },
        ],
        image: 'TextBlock.png',
        related: [
          'NumberBox',
          'TextBox',
          'RichTextBlock',
          'PasswordBox',
          'RichEditBox',
        ],
      },
      {
        id: 'TextBox',
        title: 'TextBox',
        subtitle: 'A single-line or multi-line plain text field.',
        description: 'Use a TextBox to let a user enter simple text input in your app. You can add a header and placeholder text to let the user know what the TextBox is for, and you can customize it in other ways.',
        tags: [
          'text input',
          'input field',
          'text field',
        ],
        docs: [
          {
            title: 'TextBox - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.textbox',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/controls/text-controls',
          },
        ],
        image: 'TextBox.png',
        related: [
          'NumberBox',
          'TextBlock',
          'RichTextBlock',
          'PasswordBox',
          'RichEditBox',
          'AutoSuggestBox',
        ],
      },
    ],
  },
  {
    id: 'Motion',
    title: 'Motion',
    isSpecialSection: false,
    items: [
      {
        id: 'XamlCompInterop',
        title: 'Animation interop',
        subtitle: 'XAML and Composition interop allows you to animate elements using expressions, natural animations, and more.',
        description: 'XAML and Composition interop allows you to animate elements using expressions, natural animations, and more',
        tags: [
          'composition',
          'Visual layer',
          'expression animation',
          'interop',
        ],
        docs: [
          {
            title: 'Quickstart: Motion',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion',
          },
          {
            title: 'Composition Animation - API',
            uri: 'https://learn.microsoft.com/windows/apps/windows-app-sdk/composition',
          },
          {
            title: 'Guidelines - Xaml Property Animations',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion/xaml-property-animations',
          },
        ],
        image: 'AnimationInterop.png',
        related: [
          'EasingFunction',
        ],
      },
      {
        id: 'ConnectedAnimation',
        title: 'Connected Animation',
        subtitle: 'Connected animations continue elements during page navigation and help the user maintain their context between views.',
        description: 'Connected animations continue elements during page navigation and help the user maintain their context between views.',
        tags: [
          'connected animation',
          'continuity',
          'page transition',
        ],
        docs: [
          {
            title: 'ConnectedAnimation - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.animation.connectedanimation',
          },
          {
            title: 'ConnectedAnimationService - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.animation.connectedanimationservice',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion/connected-animation',
          },
          {
            title: 'Quickstart: Motion',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion',
          },
        ],
        image: 'ConnectedAnimation.png',
        related: [
          'PageTransition',
          'ThemeTransition',
        ],
      },
      {
        id: 'EasingFunction',
        title: 'Easing Functions',
        subtitle: 'Easing is a way to manipulate the velocity of an object as it animates.',
        description: 'Easing is a way to manipulate the velocity of an object as it animates.',
        tags: [
          'animation curve',
          'velocity',
        ],
        docs: [
          {
            title: 'EasingFunctionBase - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.animation.easingfunctionbase',
          },
          {
            title: 'Timing and Easing',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion/timing-and-easing',
          },
          {
            title: 'Quickstart: Motion',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion',
          },
        ],
        image: 'EasingFunction.png',
        related: [
          'ConnectedAnimation',
          'PageTransition',
          'ThemeTransition',
        ],
      },
      {
        id: 'ImplicitTransition',
        title: 'Implicit Transitions',
        subtitle: 'Use Implicit Transitions to automatically animate changes to properties.',
        description: 'Use Implicit Transitions to automatically animate changes to properties.',
        tags: [
          'implicit animation',
          'transition',
          'property animation',
        ],
        docs: [
          {
            title: 'Transitions - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.uielement.transitions#Windows_UI_Xaml_UIElement_Transitions',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion/motion-in-practice#implicit-animations',
          },
          {
            title: 'Quickstart: Motion',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion',
          },
        ],
        image: 'ImplicitTransition.png',
        related: [
          'PageTransition',
          'ThemeTransition',
        ],
      },
      {
        id: 'PageTransition',
        title: 'Page Transitions',
        subtitle: 'Page transitions provide visual feedback about the relationship between pages.',
        description: 'Page transitions provide visual feedback about the relationship between pages.',
        tags: [
          'page transition',
          'navigation transition',
          'NavigationTransitionInfo',
        ],
        docs: [
          {
            title: 'NavigationThemeTransition - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Media.Animation.NavigationThemeTransition',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion/page-transitions',
          },
          {
            title: 'Quickstart: Motion',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion',
          },
        ],
        image: 'PageTransition.png',
        related: [
          'ConnectedAnimation',
          'ThemeTransition',
        ],
      },
      {
        id: 'ThemeTransition',
        title: 'Theme Transitions',
        subtitle: 'Theme transitions are pre-packaged, easy-to-apply animations.',
        description: 'Theme transitions are pre-packaged, easy-to-apply animations.',
        tags: [
          'theme transition',
          'entrance animation',
          'EntranceThemeTransition',
        ],
        docs: [
          {
            title: 'Transitions - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.uielement.transitions#Windows_UI_Xaml_UIElement_Transitions',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion/xaml-animation#animations-available-in-the-library',
          },
          {
            title: 'Quickstart: Motion',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion',
          },
        ],
        image: 'ThemeTransition.png',
        related: [
          'ImplicitTransition',
          'PageTransition',
        ],
      },
      {
        id: 'ParallaxView',
        title: 'ParallaxView',
        subtitle: 'A container control that provides the parallax effect when scrolling.',
        description: 'A container control that provides the parallax effect when scrolling.',
        tags: [
          'scrolling effect',
        ],
        docs: [
          {
            title: 'ParallaxView - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Controls.Parallaxview',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/motion/parallax',
          },
        ],
        image: 'ParallaxView.png',
        related: [
          'ScrollView',
          'ScrollViewer',
        ],
      },
    ],
  },
  {
    id: 'MultipleWindows',
    title: 'Windowing',
    isSpecialSection: false,
    items: [
      {
        id: 'AppWindow',
        title: 'AppWindow',
        subtitle: 'A flexible, customizable window management system for app development.',
        description: 'AppWindow provides advanced window management, allowing customization of size, position, and presentation. This sample showcases different ways to create, display, and control windows for enhanced flexibility.',
        tags: [
          'window management',
          'windowing',
        ],
        docs: [
          {
            title: 'AppWindow - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.windowing.appwindow',
          },
          {
            title: 'Window - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.window',
          },
          {
            title: 'AppWindowPresenter - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.windowing.appwindowpresenter',
          },
          {
            title: 'OverlappedPresenter - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.windowing.overlappedpresenter',
          },
          {
            title: 'FullScreenPresenter - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.windowing.fullscreenpresenter',
          },
          {
            title: 'CompactOverlayPresenter - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.windowing.compactoverlaypresenter',
          },
        ],
        image: 'AppWindow.png',
        isNew: true,
        related: [
          'AppWindowTitleBar',
          'TitleBar',
          'CreateMultipleWindows',
        ],
      },
      {
        id: 'AppWindowTitleBar',
        title: 'AppWindowTitleBar',
        subtitle: 'Provides control over the app window title bar.',
        description: 'Represents the title bar of an AppWindow and exposes APIs for deep, fine-grained customization, including advanced appearance changes, system button styling, and precise control over active and inactive window states.',
        tags: [
          'title bar',
          'caption',
          'custom title bar',
        ],
        docs: [
          {
            title: 'AppWindowTitleBar - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.windowing.appwindowtitlebar',
          },
          {
            title: 'Customize the title bar',
            uri: 'https://learn.microsoft.com/windows/apps/develop/title-bar',
          },
        ],
        image: 'TitleBar.png',
        related: [
          'AppWindow',
          'TitleBar',
        ],
      },
      {
        id: 'CreateMultipleWindows',
        title: 'Multiple windows',
        subtitle: 'An example showing the creation of single-threaded top level Xaml windows.',
        description: 'With Windows App SDK 1.0 we are allowing creation of single-threaded multiple top level Xaml windows in Desktop apps',
        tags: [
          'multiple windows',
          'new window',
          'multi window',
        ],
        docs: [
          {
            title: 'MultipleWindow - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.window',
          },
          {
            title: 'Guidelines',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.window',
          },
        ],
        image: 'CreateMultipleWindows.png',
        related: [
          'AppWindow',
          'AppWindowTitleBar',
          'TitleBar',
        ],
      },
      {
        id: 'TitleBar',
        title: 'TitleBar',
        subtitle: 'An example showing how to use the default TitleBar control.',
        description: 'The TitleBar control provides a simple way to create a modern titlebar UX with interactive content.',
        tags: [
          'title bar',
          'caption bar',
          'custom title bar',
        ],
        docs: [
          {
            title: 'Title bar customization',
            uri: 'https://learn.microsoft.com/windows/apps/develop/title-bar',
          },
          {
            title: 'Title bar - design guidelines',
            uri: 'https://learn.microsoft.com/windows/apps/design/basics/titlebar-design',
          },
        ],
        image: 'TitleBar.png',
        related: [
          'AppWindow',
          'AppWindowTitleBar',
        ],
      },
    ],
  },
  {
    id: 'System',
    title: 'System',
    isSpecialSection: false,
    items: [
      {
        id: 'Clipboard',
        title: 'Clipboard',
        subtitle: 'Copy and paste text, images, and files to and from the system Clipboard.',
        description: 'Use the Clipboard API to copy and paste text, images, and files. Configure clipboard history and roaming options, monitor content changes, and inspect available formats.',
        tags: [
          'copy',
          'paste',
          'cut',
        ],
        docs: [
          {
            title: 'Clipboard - API',
            uri: 'https://learn.microsoft.com/uwp/api/windows.applicationmodel.datatransfer.clipboard',
          },
          {
            title: 'ClipboardContentOptions - API',
            uri: 'https://learn.microsoft.com/uwp/api/windows.applicationmodel.datatransfer.clipboardcontentoptions',
          },
          {
            title: 'Copy and paste - Guide',
            uri: 'https://learn.microsoft.com/windows/apps/develop/communication/copy-and-paste',
          },
        ],
        image: 'Clipboard.png',
        related: [
          'StoragePickers',
        ],
      },
      {
        id: 'ContentIsland',
        title: 'ContentIsland',
        subtitle: 'Create ContentIslands to host other frameworks in your app.',
        description: 'Create ContentIslands to host other frameworks in your app.',
        tags: [
          'content island',
          'hosting',
          'interop',
        ],
        docs: [
          {
            title: 'ContentIsland - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.content.contentisland',
          },
        ],
        image: 'ContentIsland.png',
        isNew: true,
        related: [],
      },
      {
        id: 'StoragePickers',
        title: 'Storage pickers',
        subtitle: 'Select files and folders with modern system pickers.',
        description: 'Use the FileOpenPicker, FileSavePicker, and FolderPicker APIs to let users select files and folders in a secure way.',
        tags: [
          'file picker',
          'FileOpenPicker',
          'FileSavePicker',
          'FolderPicker',
          'file dialog',
        ],
        docs: [
          {
            title: 'FileOpenPicker - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.storage.pickers.fileopenpicker',
          },
          {
            title: 'FileSavePicker - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.storage.pickers.filesavepicker',
          },
          {
            title: 'FolderPicker - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.storage.pickers.folderpicker',
          },
        ],
        image: 'StoragePickers.png',
        related: [
          'Clipboard',
        ],
      },
    ],
  },
  {
    id: 'Shell',
    title: 'Shell',
    isSpecialSection: false,
    items: [
      {
        id: 'AppNotification',
        title: 'App notifications',
        subtitle: 'Send notifications that appear in the Action Center and as toast popups.',
        description: 'Send rich, interactive notifications from your app. Notifications can include text, images, and actions.',
        tags: [
          'toast',
          'notification',
          'Action Center',
          'toast notification',
        ],
        docs: [
          {
            title: 'AppNotification - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.appnotifications.appnotification',
          },
          {
            title: 'AppNotificationManager - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.appnotifications.appnotificationmanager',
          },
          {
            title: 'AppNotificationBuilder - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.appnotifications.builder.appnotificationbuilder',
          },
          {
            title: 'Toast notifications',
            uri: 'https://learn.microsoft.com/windows/apps/design/shell/tiles-and-notifications/toast-notifications-overview',
          },
        ],
        image: 'AppNotification.png',
        isNew: true,
        related: [
          'BadgeNotificationManager',
        ],
      },
      {
        id: 'BadgeNotificationManager',
        title: 'Badge notifications',
        subtitle: 'Show numeric or icon badges on your app’s taskbar icon.',
        description: 'Badge notifications are a lightweight way to show status or alerts as small overlays on your app\'s taskbar icon.',
        tags: [
          'taskbar badge',
          'badge',
          'notification badge',
        ],
        docs: [
          {
            title: 'BadgeUpdateManager - API',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.badgenotifications.badgenotificationmanager',
          },
          {
            title: 'BadgeNotificationGlyph Enum',
            uri: 'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.badgenotifications.badgenotificationglyph',
          },
          {
            title: 'Badge notifications',
            uri: 'https://learn.microsoft.com/windows/apps/design/shell/tiles-and-notifications/badges',
          },
        ],
        image: 'BadgeNotification.png',
        isNew: true,
        related: [
          'AppNotification',
          'InfoBadge',
        ],
      },
      {
        id: 'JumpList',
        title: 'JumpList',
        subtitle: 'Add custom tasks and groups to the app\'s taskbar jump list.',
        description: 'Jump lists let you add custom tasks and groups to the app\'s right-click menu on the taskbar. Use them to provide quick access to frequently used actions or recently opened items.',
        tags: [
          'jump list',
          'taskbar',
          'recent',
          'tasks',
        ],
        docs: [
          {
            title: 'JumpList - API',
            uri: 'https://learn.microsoft.com/uwp/api/windows.ui.startscreen.jumplist',
          },
          {
            title: 'JumpListItem - API',
            uri: 'https://learn.microsoft.com/uwp/api/windows.ui.startscreen.jumplistitem',
          },
        ],
        image: 'JumpList.png',
        isNew: true,
        related: [],
      },
    ],
  },
]

export const GROUP_COUNT: number = CATALOG.length // 19

export const ITEM_COUNT: number = CATALOG.reduce((n, g) => n + g.items.length, 0) // 120
