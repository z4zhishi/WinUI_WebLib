// WinUI Symbol 枚举 → Segoe 图形码点映射(生成物,勿手改)。
// 生成:docs/temp/build-icon-glyphs.mjs(再生成:node docs/temp/build-icon-glyphs.mjs)
// 数据源(只读):
//   - 枚举成员与顺序:CK/WinUI-Reference/dxaml/xcp/dxaml/idl/winrt/controls/microsoft.ui.xaml.controls.controls2.idl
//   - 名称→推荐码点:CK/WinUI-Reference/dxaml/xcp/core/core/elements/icon.cpp
//     CSymbolIcon::ConvertSymbolValueToGlyph(WP 旧码点重映射到 E7+ 推荐区,避免 unicode 撞码)。
// 共 197 个成员,与 WinUI 3 (Windows App SDK) Symbol 枚举一一对应。

/** WinUI 3 Symbol 枚举成员名(声明顺序与官方 idl 一致,首成员 Previous = 57600)。 */
export type SymbolValue =
  | 'Previous'
  | 'Next'
  | 'Play'
  | 'Pause'
  | 'Edit'
  | 'Save'
  | 'Clear'
  | 'Delete'
  | 'Remove'
  | 'Add'
  | 'Cancel'
  | 'Accept'
  | 'More'
  | 'Redo'
  | 'Undo'
  | 'Home'
  | 'Up'
  | 'Forward'
  | 'Back'
  | 'Favorite'
  | 'Camera'
  | 'Setting'
  | 'Video'
  | 'Sync'
  | 'Download'
  | 'Mail'
  | 'Find'
  | 'Help'
  | 'Upload'
  | 'Emoji'
  | 'TwoPage'
  | 'LeaveChat'
  | 'MailForward'
  | 'Clock'
  | 'Send'
  | 'Crop'
  | 'RotateCamera'
  | 'People'
  | 'OpenPane'
  | 'ClosePane'
  | 'World'
  | 'Flag'
  | 'PreviewLink'
  | 'Globe'
  | 'Trim'
  | 'AttachCamera'
  | 'ZoomIn'
  | 'Bookmarks'
  | 'Document'
  | 'ProtectedDocument'
  | 'Page'
  | 'Bullets'
  | 'Comment'
  | 'MailFilled'
  | 'ContactInfo'
  | 'HangUp'
  | 'ViewAll'
  | 'MapPin'
  | 'Phone'
  | 'VideoChat'
  | 'Switch'
  | 'Contact'
  | 'Rename'
  | 'Pin'
  | 'MusicInfo'
  | 'Go'
  | 'Keyboard'
  | 'DockLeft'
  | 'DockRight'
  | 'DockBottom'
  | 'Remote'
  | 'Refresh'
  | 'Rotate'
  | 'Shuffle'
  | 'List'
  | 'Shop'
  | 'SelectAll'
  | 'Orientation'
  | 'Import'
  | 'ImportAll'
  | 'BrowsePhotos'
  | 'WebCam'
  | 'Pictures'
  | 'SaveLocal'
  | 'Caption'
  | 'Stop'
  | 'ShowResults'
  | 'Volume'
  | 'Repair'
  | 'Message'
  | 'Page2'
  | 'CalendarDay'
  | 'CalendarWeek'
  | 'Calendar'
  | 'Character'
  | 'MailReplyAll'
  | 'Read'
  | 'Link'
  | 'Account'
  | 'ShowBcc'
  | 'HideBcc'
  | 'Cut'
  | 'Attach'
  | 'Paste'
  | 'Filter'
  | 'Copy'
  | 'Emoji2'
  | 'Important'
  | 'MailReply'
  | 'SlideShow'
  | 'Sort'
  | 'Manage'
  | 'AllApps'
  | 'DisconnectDrive'
  | 'MapDrive'
  | 'NewWindow'
  | 'OpenWith'
  | 'ContactPresence'
  | 'Priority'
  | 'GoToToday'
  | 'Font'
  | 'FontColor'
  | 'Contact2'
  | 'Folder'
  | 'Audio'
  | 'Placeholder'
  | 'View'
  | 'SetLockScreen'
  | 'SetTile'
  | 'ClosedCaption'
  | 'StopSlideShow'
  | 'Permissions'
  | 'Highlight'
  | 'DisableUpdates'
  | 'UnFavorite'
  | 'UnPin'
  | 'OpenLocal'
  | 'Mute'
  | 'Italic'
  | 'Underline'
  | 'Bold'
  | 'MoveToFolder'
  | 'LikeDislike'
  | 'Dislike'
  | 'Like'
  | 'AlignRight'
  | 'AlignCenter'
  | 'AlignLeft'
  | 'Zoom'
  | 'ZoomOut'
  | 'OpenFile'
  | 'OtherUser'
  | 'Admin'
  | 'Street'
  | 'Map'
  | 'ClearSelection'
  | 'FontDecrease'
  | 'FontIncrease'
  | 'FontSize'
  | 'CellPhone'
  | 'ReShare'
  | 'Tag'
  | 'RepeatOne'
  | 'RepeatAll'
  | 'OutlineStar'
  | 'SolidStar'
  | 'Calculator'
  | 'Directions'
  | 'Target'
  | 'Library'
  | 'PhoneBook'
  | 'Memo'
  | 'Microphone'
  | 'PostUpdate'
  | 'BackToWindow'
  | 'FullScreen'
  | 'NewFolder'
  | 'CalendarReply'
  | 'UnSyncFolder'
  | 'ReportHacked'
  | 'SyncFolder'
  | 'BlockContact'
  | 'SwitchApps'
  | 'AddFriend'
  | 'TouchPointer'
  | 'GoToStart'
  | 'ZeroBars'
  | 'OneBar'
  | 'TwoBars'
  | 'ThreeBars'
  | 'FourBars'
  | 'Scan'
  | 'Preview'
  | 'GlobalNavigationButton'
  | 'Share'
  | 'Print'
  | 'XboxOneConsole'

/** Symbol 成员名 → 对应图形字符(已应用官方推荐码点重映射)。 */
export const SYMBOL_GLYPHS: Readonly<Record<SymbolValue, string>> = {
  'Previous': '\uE892',
  'Next': '\uE893',
  'Play': '\uE768',
  'Pause': '\uE769',
  'Edit': '\uE70F',
  'Save': '\uE74E',
  'Clear': '\uE894',
  'Delete': '\uE74D',
  'Remove': '\uE738',
  'Add': '\uE710',
  'Cancel': '\uE711',
  'Accept': '\uE8FB',
  'More': '\uE712',
  'Redo': '\uE7A6',
  'Undo': '\uE7A7',
  'Home': '\uE80F',
  'Up': '\uE74A',
  'Forward': '\uE72A',
  'Back': '\uE72B',
  'Favorite': '\uE734',
  'Camera': '\uE722',
  'Setting': '\uE713',
  'Video': '\uE714',
  'Sync': '\uE895',
  'Download': '\uE896',
  'Mail': '\uE715',
  'Find': '\uE721',
  'Help': '\uE897',
  'Upload': '\uE898',
  'Emoji': '\uE899',
  'TwoPage': '\uE89A',
  'LeaveChat': '\uE89B',
  'MailForward': '\uE89C',
  'Clock': '\uE823',
  'Send': '\uE724',
  'Crop': '\uE7A8',
  'RotateCamera': '\uE89E',
  'People': '\uE716',
  'OpenPane': '\uE8A0',
  'ClosePane': '\uE89F',
  'World': '\uE909',
  'Flag': '\uE7C1',
  'PreviewLink': '\uE8A1',
  'Globe': '\uE774',
  'Trim': '\uE78A',
  'AttachCamera': '\uE8A2',
  'ZoomIn': '\uE8A3',
  'Bookmarks': '\uE8A4',
  'Document': '\uE8A5',
  'ProtectedDocument': '\uE8A6',
  'Page': '\uE729',
  'Bullets': '\uE8FD',
  'Comment': '\uE90A',
  'MailFilled': '\uE8A8',
  'ContactInfo': '\uE779',
  'HangUp': '\uE778',
  'ViewAll': '\uE8A9',
  'MapPin': '\uE7B7',
  'Phone': '\uE717',
  'VideoChat': '\uE8AA',
  'Switch': '\uE8AB',
  'Contact': '\uE77B',
  'Rename': '\uE8AC',
  'Pin': '\uE718',
  'MusicInfo': '\uE90B',
  'Go': '\uE8AD',
  'Keyboard': '\uE765',
  'DockLeft': '\uE90C',
  'DockRight': '\uE90D',
  'DockBottom': '\uE90E',
  'Remote': '\uE8AF',
  'Refresh': '\uE72C',
  'Rotate': '\uE7AD',
  'Shuffle': '\uE8B1',
  'List': '\uEA37',
  'Shop': '\uE719',
  'SelectAll': '\uE8B3',
  'Orientation': '\uE8B4',
  'Import': '\uE8B5',
  'ImportAll': '\uE8B6',
  'BrowsePhotos': '\uE7C5',
  'WebCam': '\uE8B8',
  'Pictures': '\uE8B9',
  'SaveLocal': '\uE78C',
  'Caption': '\uE8BA',
  'Stop': '\uE71A',
  'ShowResults': '\uE8BC',
  'Volume': '\uE767',
  'Repair': '\uE90F',
  'Message': '\uE8BD',
  'Page2': '\uE7C3',
  'CalendarDay': '\uE8BF',
  'CalendarWeek': '\uE8C0',
  'Calendar': '\uE787',
  'Character': '\uE8C1',
  'MailReplyAll': '\uE8C2',
  'Read': '\uE8C3',
  'Link': '\uE71B',
  'Account': '\uE910',
  'ShowBcc': '\uE8C4',
  'HideBcc': '\uE8C5',
  'Cut': '\uE8C6',
  'Attach': '\uE723',
  'Paste': '\uE77F',
  'Filter': '\uE71C',
  'Copy': '\uE8C8',
  'Emoji2': '\uE76E',
  'Important': '\uE8C9',
  'MailReply': '\uE8CA',
  'SlideShow': '\uE786',
  'Sort': '\uE8CB',
  'Manage': '\uE912',
  'AllApps': '\uE71D',
  'DisconnectDrive': '\uE8CD',
  'MapDrive': '\uE8CE',
  'NewWindow': '\uE78B',
  'OpenWith': '\uE7AC',
  'ContactPresence': '\uE8CF',
  'Priority': '\uE8D0',
  'GoToToday': '\uE8D1',
  'Font': '\uE8D2',
  'FontColor': '\uE8D3',
  'Contact2': '\uE8D4',
  'Folder': '\uE8B7',
  'Audio': '\uE8D6',
  'Placeholder': '\uE18A',
  'View': '\uE890',
  'SetLockScreen': '\uE7B5',
  'SetTile': '\uE97B',
  'ClosedCaption': '\uE7F0',
  'StopSlideShow': '\uE620',
  'Permissions': '\uE8D7',
  'Highlight': '\uE7E6',
  'DisableUpdates': '\uE8D8',
  'UnFavorite': '\uE8D9',
  'UnPin': '\uE77A',
  'OpenLocal': '\uE8DA',
  'Mute': '\uE74F',
  'Italic': '\uE8DB',
  'Underline': '\uE8DC',
  'Bold': '\uE8DD',
  'MoveToFolder': '\uE8DE',
  'LikeDislike': '\uE8DF',
  'Dislike': '\uE8E0',
  'Like': '\uE8E1',
  'AlignRight': '\uE8E2',
  'AlignCenter': '\uE8E3',
  'AlignLeft': '\uE8E4',
  'Zoom': '\uE71E',
  'ZoomOut': '\uE71F',
  'OpenFile': '\uE8E5',
  'OtherUser': '\uE7EE',
  'Admin': '\uE7EF',
  'Street': '\uE913',
  'Map': '\uE707',
  'ClearSelection': '\uE8E6',
  'FontDecrease': '\uE8E7',
  'FontIncrease': '\uE8E8',
  'FontSize': '\uE8E9',
  'CellPhone': '\uE8EA',
  'ReShare': '\uE8EB',
  'Tag': '\uE8EC',
  'RepeatOne': '\uE8ED',
  'RepeatAll': '\uE8EE',
  'OutlineStar': '\uE734',
  'SolidStar': '\uE735',
  'Calculator': '\uE8EF',
  'Directions': '\uE8F0',
  'Target': '\uF5F0',
  'Library': '\uE8F1',
  'PhoneBook': '\uE780',
  'Memo': '\uE77C',
  'Microphone': '\uE720',
  'PostUpdate': '\uE8F3',
  'BackToWindow': '\uE73F',
  'FullScreen': '\uE740',
  'NewFolder': '\uE8F4',
  'CalendarReply': '\uE8F5',
  'UnSyncFolder': '\uE8F6',
  'ReportHacked': '\uE730',
  'SyncFolder': '\uE8F7',
  'BlockContact': '\uE8F8',
  'SwitchApps': '\uE8F9',
  'AddFriend': '\uE8FA',
  'TouchPointer': '\uE7C9',
  'GoToStart': '\uE8FC',
  'ZeroBars': '\uE904',
  'OneBar': '\uE905',
  'TwoBars': '\uE906',
  'ThreeBars': '\uE907',
  'FourBars': '\uE908',
  'Scan': '\uE8FE',
  'Preview': '\uE8FF',
  'GlobalNavigationButton': '\uE700',
  'Share': '\uE72D',
  'Print': '\uE749',
  'XboxOneConsole': '\uE990',
}

/** Symbol 全部成员名,按官方枚举声明顺序排列(下拉/浏览用)。 */
export const SYMBOL_NAMES: readonly SymbolValue[] = [
  'Previous',
  'Next',
  'Play',
  'Pause',
  'Edit',
  'Save',
  'Clear',
  'Delete',
  'Remove',
  'Add',
  'Cancel',
  'Accept',
  'More',
  'Redo',
  'Undo',
  'Home',
  'Up',
  'Forward',
  'Back',
  'Favorite',
  'Camera',
  'Setting',
  'Video',
  'Sync',
  'Download',
  'Mail',
  'Find',
  'Help',
  'Upload',
  'Emoji',
  'TwoPage',
  'LeaveChat',
  'MailForward',
  'Clock',
  'Send',
  'Crop',
  'RotateCamera',
  'People',
  'OpenPane',
  'ClosePane',
  'World',
  'Flag',
  'PreviewLink',
  'Globe',
  'Trim',
  'AttachCamera',
  'ZoomIn',
  'Bookmarks',
  'Document',
  'ProtectedDocument',
  'Page',
  'Bullets',
  'Comment',
  'MailFilled',
  'ContactInfo',
  'HangUp',
  'ViewAll',
  'MapPin',
  'Phone',
  'VideoChat',
  'Switch',
  'Contact',
  'Rename',
  'Pin',
  'MusicInfo',
  'Go',
  'Keyboard',
  'DockLeft',
  'DockRight',
  'DockBottom',
  'Remote',
  'Refresh',
  'Rotate',
  'Shuffle',
  'List',
  'Shop',
  'SelectAll',
  'Orientation',
  'Import',
  'ImportAll',
  'BrowsePhotos',
  'WebCam',
  'Pictures',
  'SaveLocal',
  'Caption',
  'Stop',
  'ShowResults',
  'Volume',
  'Repair',
  'Message',
  'Page2',
  'CalendarDay',
  'CalendarWeek',
  'Calendar',
  'Character',
  'MailReplyAll',
  'Read',
  'Link',
  'Account',
  'ShowBcc',
  'HideBcc',
  'Cut',
  'Attach',
  'Paste',
  'Filter',
  'Copy',
  'Emoji2',
  'Important',
  'MailReply',
  'SlideShow',
  'Sort',
  'Manage',
  'AllApps',
  'DisconnectDrive',
  'MapDrive',
  'NewWindow',
  'OpenWith',
  'ContactPresence',
  'Priority',
  'GoToToday',
  'Font',
  'FontColor',
  'Contact2',
  'Folder',
  'Audio',
  'Placeholder',
  'View',
  'SetLockScreen',
  'SetTile',
  'ClosedCaption',
  'StopSlideShow',
  'Permissions',
  'Highlight',
  'DisableUpdates',
  'UnFavorite',
  'UnPin',
  'OpenLocal',
  'Mute',
  'Italic',
  'Underline',
  'Bold',
  'MoveToFolder',
  'LikeDislike',
  'Dislike',
  'Like',
  'AlignRight',
  'AlignCenter',
  'AlignLeft',
  'Zoom',
  'ZoomOut',
  'OpenFile',
  'OtherUser',
  'Admin',
  'Street',
  'Map',
  'ClearSelection',
  'FontDecrease',
  'FontIncrease',
  'FontSize',
  'CellPhone',
  'ReShare',
  'Tag',
  'RepeatOne',
  'RepeatAll',
  'OutlineStar',
  'SolidStar',
  'Calculator',
  'Directions',
  'Target',
  'Library',
  'PhoneBook',
  'Memo',
  'Microphone',
  'PostUpdate',
  'BackToWindow',
  'FullScreen',
  'NewFolder',
  'CalendarReply',
  'UnSyncFolder',
  'ReportHacked',
  'SyncFolder',
  'BlockContact',
  'SwitchApps',
  'AddFriend',
  'TouchPointer',
  'GoToStart',
  'ZeroBars',
  'OneBar',
  'TwoBars',
  'ThreeBars',
  'FourBars',
  'Scan',
  'Preview',
  'GlobalNavigationButton',
  'Share',
  'Print',
  'XboxOneConsole',
]

/** WinUI 默认值:Symbol 属性缺省为 Emoji(= 57629 → 渲染 E899)。
 * 出处(双处独立实证):CK/.../core/inc/icon.h L80 构造器 m_nSymbol(Symbol::Emoji);
 * CK/.../components/DependencyObject/DependencyProperty.cpp L800 GetDefaultValue case SymbolIcon_Symbol → Emoji。
 * 注意并非「枚举首成员即缺省」(首成员 Previous = 57600 仅为声明顺序)。 */
export const SYMBOL_DEFAULT: SymbolValue = 'Emoji'

/** Symbol 成员名 → 图形字符;未知名称回退 undefined。 */
export function symbolToGlyph(symbol: string): string | undefined {
  return (SYMBOL_GLYPHS as Readonly<Record<string, string | undefined>>)[symbol]
}
