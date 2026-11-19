import ast
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
LOCALE = os.path.join(ROOT, 'maweb-django', 'web', 'locale')
OUT = os.path.abspath(os.path.join(HERE, '..', 'src', 'locales.ts'))

PO_DIRS = {
    'en': 'en',
    'zh-hans': 'zh_Hans',
    'zh-hant': 'zh_Hant',
    'ja': 'ja',
}

OVERRIDES = {
    'en': {
        'START::DASH': "Let's go!",
        'reg_success': 'Registered! Please check your email for the activation link.',
        'Login expired, please sign in again.': 'Login expired, please sign in again.',
        'Your account is restricted from editing right now.': 'Your account is restricted from editing right now.',
        'Content is too long, please shorten it and try again.': 'Content is too long, please shorten it and try again.',
        'Network error, please check your connection.': 'Network error, please check your connection.',
    },
    'zh-hans': {
        'START::DASH': '开始吧!!',
        'reg_success': '注册成功，请检查邮箱以激活帐号',
        'Never': '从未',
        'No score record': '暂无成绩记录',
        'Push news': '推送新闻',
        'News published.': '新闻已上线。',
        'News unpublished.': '新闻已下线。',
        'You do not have permission to push news.': '没有权限推送新闻。',
        'Badge': '徽章',
        'No badges': '暂无徽章',
        'Login expired, please sign in again.': '登录已过期，请重新登录',
        'Your account is restricted from editing right now.': '当前账号暂时无法编辑内容',
        'Content is too long, please shorten it and try again.': '内容过长，请精简后重试',
        'Network error, please check your connection.': '网络异常，请检查网络后重试',
    },
    'zh-hant': {
        'START::DASH': '開始吧!!',
        'reg_success': '註冊成功，請檢查信箱以啟用帳號',
        'Played': '遊玩時長',
        'Charts been played': '譜面被遊玩',
        'Stable charts': '上架譜面',
        'Unstable charts': '非上架譜面',
        'Chart slot': '譜面上傳位',
        'Never': '從未',
        'No score record': '暫無成績記錄',
        'Push news': '推送新聞',
        'News published.': '新聞已上線。',
        'News unpublished.': '新聞已下線。',
        'You do not have permission to push news.': '沒有權限推送新聞。',
        'Badge': '徽章',
        'No badges': '暫無徽章',
        'Login expired, please sign in again.': '登入已過期，請重新登入',
        'Your account is restricted from editing right now.': '目前帳號暫時無法編輯內容',
        'Content is too long, please shorten it and try again.': '內容過長，請精簡後重試',
        'Network error, please check your connection.': '網路異常，請檢查連線後重試',
    },
    'ja': {
        'START::DASH': 'スタート::ダッシュ!!',
        'reg_success': '登録しました。認証メールをご確認ください',
        'Played': 'プレイ時間',
        'Never': 'なし',
        'No score record': 'スコア記録なし',
        'Push news': 'ニュースを公開',
        'News published.': 'ニュースを公開しました。',
        'News unpublished.': 'ニュースを非公開にしました。',
        'You do not have permission to push news.': 'ニュースを公開する権限がありません。',
        'Badge': 'バッジ',
        'No badges': 'バッジなし',
        'Login expired, please sign in again.': 'ログインの有効期限が切れました。再度ログインしてください',
        'Your account is restricted from editing right now.': '現在このアカウントでは編集できません',
        'Content is too long, please shorten it and try again.': '内容が長すぎます。短くしてからもう一度お試しください',
        'Network error, please check your connection.': '通信エラーです。接続を確認してもう一度お試しください',
    },
}


EVENT_MESSAGES = {
    'zh-hans': {
        'Active only': '仅进行中',
        'Add chart': '添加谱面',
        'All events': '全部活动',
        'Back to events': '返回活动列表',
        'Chart IDs': '谱面 ID',
        'Chart not found': '谱面不存在',
        'Charts preview': '谱面预览',
        'Cover uploaded': '封面已上传',
        'Create event': '新建活动',
        'Edit event': '编辑活动',
        'End': '结束',
        'Ended': '已结束',
        'Event charts': '活动谱面',
        'Event cover': '活动封面',
        'Event created': '活动已创建',
        'Event limit reached': '活动数量已达上限',
        'Event not found': '活动不存在',
        'Event rank': '活动榜单',
        'Event ranking': '活动排行',
        'Event saved': '活动已保存',
        'Events': '活动',
        'Failed to load events': '活动加载失败',
        'Load more': '加载更多',
        'Loading': '加载中',
        'Missing required fields': '请填写必填项',
        'No charts': '暂无谱面',
        'No events': '暂无活动',
        'No permission to manage events': '没有权限管理活动',
        'No ranking': '暂无排行',
        'Ongoing': '进行中',
        'Remove': '移除',
        'Start': '开始',
        'Type': '类型',
        'Unknown': '未知',
        'Upcoming': '即将开始',
        'Upload failed': '上传失败',
        'Wiki page': 'Wiki 页面',
        'Default': '默认',
        'Section': '分段',
        'New default': '新默认',
        'New section': '新分段',
        'Retry': '重试',
        'Invalid chart ID': '谱面 ID 无效',
        'Duplicate chart': '谱面已添加',
        'View event': '查看活动',
        'Invalid event type': '活动类型无效',
        'Invalid wiki page': 'Wiki 页面 ID 无效',
        'Editing is available for active account': '需要登录有效账号才能编辑',
        'Combo': '连击数',
        'Name': '名称',
        'Upload image': '上传图片',
        'Cover': '封面',
        'Lv.{{value}}': '等级 {{value}}',
        'Save the event before uploading a cover': '请先保存活动再上传封面',
        'Select a cover image first': '请先选择封面图片',
    },
    'zh-hant': {
        'Active only': '僅進行中',
        'Add chart': '新增譜面',
        'All events': '全部活動',
        'Back to events': '返回活動列表',
        'Chart IDs': '譜面 ID',
        'Chart not found': '譜面不存在',
        'Charts preview': '譜面預覽',
        'Cover uploaded': '封面已上傳',
        'Create event': '新增活動',
        'Edit event': '編輯活動',
        'End': '結束',
        'Ended': '已結束',
        'Event charts': '活動譜面',
        'Event cover': '活動封面',
        'Event created': '活動已建立',
        'Event limit reached': '活動數量已達上限',
        'Event not found': '活動不存在',
        'Event rank': '活動榜單',
        'Event ranking': '活動排行',
        'Event saved': '活動已儲存',
        'Events': '活動',
        'Failed to load events': '活動載入失敗',
        'Load more': '載入更多',
        'Loading': '載入中',
        'Missing required fields': '請填寫必填項目',
        'No charts': '暫無譜面',
        'No events': '暫無活動',
        'No permission to manage events': '沒有權限管理活動',
        'No ranking': '暫無排行',
        'Ongoing': '進行中',
        'Remove': '移除',
        'Start': '開始',
        'Type': '類型',
        'Unknown': '未知',
        'Upcoming': '即將開始',
        'Upload failed': '上傳失敗',
        'Wiki page': 'Wiki 頁面',
        'Default': '預設',
        'Section': '分段',
        'New default': '新預設',
        'New section': '新分段',
        'Retry': '重試',
        'Invalid chart ID': '譜面 ID 無效',
        'Duplicate chart': '譜面已新增',
        'View event': '查看活動',
        'Invalid event type': '活動類型無效',
        'Invalid wiki page': 'Wiki 頁面 ID 無效',
        'Editing is available for active account': '需要登入有效帳號才能編輯',
        'Upload image': '上傳圖片',
        'Cover': '封面',
        'Name': '暱稱',
        'Combo': '連擊數',
        'Lv.{{value}}': '等級 {{value}}',
        'Save the event before uploading a cover': '請先儲存活動再上傳封面',
        'Select a cover image first': '請先選擇封面圖片',
    },
    'ja': {
        'Active only': '開催中のみ',
        'Add chart': '譜面を追加',
        'All events': 'すべてのイベント',
        'Back to events': 'イベント一覧へ',
        'Chart IDs': '譜面 ID',
        'Chart not found': '譜面が見つかりません',
        'Charts preview': '譜面プレビュー',
        'Cover uploaded': 'カバーをアップロードしました',
        'Create event': 'イベントを作成',
        'Edit event': 'イベントを編集',
        'End': '終了',
        'Ended': '終了',
        'Event charts': 'イベント譜面',
        'Event cover': 'イベントカバー',
        'Event created': 'イベントを作成しました',
        'Event limit reached': 'イベント数が上限です',
        'Event not found': 'イベントが見つかりません',
        'Event rank': 'イベントランキング',
        'Event ranking': 'イベントランキング',
        'Event saved': 'イベントを保存しました',
        'Events': 'イベント',
        'Failed to load events': 'イベントの読み込みに失敗しました',
        'Load more': 'もっと見る',
        'Loading': '読み込み中',
        'Missing required fields': '必須項目を入力してください',
        'No charts': '譜面がありません',
        'No events': 'イベントがありません',
        'No permission to manage events': 'イベントを管理する権限がありません',
        'No ranking': 'ランキングがありません',
        'Ongoing': '開催中',
        'Remove': '削除',
        'Start': '開始',
        'Type': '種類',
        'Unknown': '不明',
        'Upcoming': '開催前',
        'Upload failed': 'アップロードに失敗しました',
        'Wiki page': 'Wiki ページ',
        'Default': 'デフォルト',
        'Section': 'セクション',
        'New default': '新デフォルト',
        'New section': '新セクション',
        'Retry': '再試行',
        'Invalid chart ID': '譜面 ID が無効です',
        'Duplicate chart': '譜面は既に追加されています',
        'View event': 'イベントを見る',
        'Invalid event type': 'イベントの種類が無効です',
        'Invalid wiki page': 'Wiki ページ ID が無効です',
        'Editing is available for active account': '有効なアカウントで編集可能',
        'Combo': 'コンボ',
        'Name': '名前',
        'Cover': 'カバー',
        'Upload image': 'プレビューをアップロード',
        'Lv.{{value}}': 'Lv.{{value}}',
        'Save the event before uploading a cover': 'カバーをアップロードする前にイベントを保存してください',
        'Select a cover image first': 'カバー画像を選択してください',
    },
}

for code, extra in EVENT_MESSAGES.items():
    OVERRIDES[code].update(extra)


CHART_MESSAGES = {
    'zh-hans': {
        'Filters': '筛选',
        'Song, artist, tag...': '歌曲、作者、标签…',
        'All modes': '全部玩法',
        'More filters': '更多筛选',
        'Level range': '等级范围',
        'BPM range': 'BPM 范围',
        'Length range': '时长范围',
        'Min level': '最低等级',
        'Max level': '最高等级',
        'Min BPM': '最低 BPM',
        'Max BPM': '最高 BPM',
        'Shortest (s)': '最短(秒)',
        'Longest (s)': '最长(秒)',
        'Sort by': '排序',
        'Latest': '最新',
        'Most played': '最多游玩',
        'Ascending': '升序',
        'Descending': '降序',
        'Apply filters': '应用筛选',
        'Reset': '重置',
        'Order': '顺序',
        'Normal': '普通',
        '{{count}} charts': '共 {{count}} 个谱面',
        'Failed to load charts': '谱面加载失败',
        'No charts found': '没有符合条件的谱面',
        'Stable': 'Stable',
        'Beta': 'Beta',
        'Alpha': 'Alpha',
        'Freestyle': 'Freestyle',
        'Freestyle only': '仅 Freestyle',
        'Retry': '重试',
        'Select page': '选择页码',
        'Previous': '上一页',
        'Next': '下一页',
    },
    'zh-hant': {
        'Filters': '篩選',
        'Song, artist, tag...': '歌曲、作者、標籤…',
        'All modes': '全部玩法',
        'More filters': '更多篩選',
        'Level range': '等級範圍',
        'BPM range': 'BPM 範圍',
        'Length range': '時長範圍',
        'Min level': '最低等級',
        'Max level': '最高等級',
        'Min BPM': '最低 BPM',
        'Max BPM': '最高 BPM',
        'Shortest (s)': '最短(秒)',
        'Longest (s)': '最長(秒)',
        'Sort by': '排序',
        'Latest': '最新',
        'Most played': '最多遊玩',
        'Ascending': '升序',
        'Descending': '降序',
        'Apply filters': '套用篩選',
        'Reset': '重置',
        'Order': '順序',
        'Normal': '普通',
        '{{count}} charts': '共 {{count}} 個譜面',
        'Failed to load charts': '譜面載入失敗',
        'No charts found': '沒有符合條件的譜面',
        'Stable': 'Stable',
        'Beta': 'Beta',
        'Alpha': 'Alpha',
        'Freestyle': 'Freestyle',
        'Freestyle only': '僅 Freestyle',
        'Retry': '重試',
        'Select page': '選擇頁碼',
        'Previous': '上一頁',
        'Next': '下一頁',
        'All': '所有',
        'Keywords': '關鍵字',
    },
    'ja': {
        'Filters': 'フィルタ',
        'Song, artist, tag...': '曲名、作者、タグ…',
        'All modes': '全モード',
        'More filters': '詳細フィルタ',
        'Level range': 'レベル範囲',
        'BPM range': 'BPM 範囲',
        'Length range': '長さ範囲',
        'Min level': '最小レベル',
        'Max level': '最大レベル',
        'Min BPM': '最小 BPM',
        'Max BPM': '最大 BPM',
        'Shortest (s)': '最短(秒)',
        'Longest (s)': '最長(秒)',
        'Sort by': '並び替え',
        'Latest': '新着',
        'Most played': 'プレイ数順',
        'Ascending': '昇順',
        'Descending': '降順',
        'Apply filters': 'フィルタを適用',
        'Reset': 'リセット',
        'Order': '並び順',
        'Normal': '通常',
        '{{count}} charts': '{{count}} 件の譜面',
        'Failed to load charts': '譜面の読み込みに失敗しました',
        'No charts found': '条件に合う譜面がありません',
        'Stable': 'Stable',
        'Beta': 'Beta',
        'Alpha': 'Alpha',
        'Freestyle': 'Freestyle',
        'Freestyle only': 'Freestyle のみ',
        'Retry': '再試行',
        'Select page': 'ページを選択',
        'Previous': '前へ',
        'Next': '次へ',
    },
}

for code, extra in CHART_MESSAGES.items():
    OVERRIDES[code].update(extra)


# WikiMeta「立刻推广」的业务错误提示。英文 key 即英文文案，en 块无需收录
# （i18n 的 t() 对缺词条回退到 key 本身）；其余语言由这里注入。
# 返回码对照见 src/pages/wiki/promoteMessages.ts。
PROMOTE_MESSAGES = {
    'zh-hans': {
        'Session expired, please sign in again': '登录已过期，请重新登录',
        'Only the chart author can promote a non-Stable chart': '只有谱面作者可以推广，Stable 谱面不可推广',
        'Chart length must be at least 60 seconds': '谱面时长需至少 60 秒',
        'Please set a level before promoting': '请先设置谱面等级再推广',
        'The chart needs at least 60 seconds of length and a non-zero level': '谱面时长需至少 60 秒且等级不能为 0（请先保存元信息）',
        'Save the chart info before promoting': '请先保存谱面信息再推广',
        'Not enough gold for promotion': '金币不足，推广需要 {{price}} 金币',
        'Please wait 24 hours before promoting again': '24 小时内只能推广一次，请稍后再试',
        'Promotion failed, please try again later': '推广失败，请稍后重试',
    },
    'zh-hant': {
        'Session expired, please sign in again': '登入已過期，請重新登入',
        'Only the chart author can promote a non-Stable chart': '只有譜面作者可以推廣，Stable 譜面不可推廣',
        'Chart length must be at least 60 seconds': '譜面時長需至少 60 秒',
        'Please set a level before promoting': '請先設定譜面等級再推廣',
        'The chart needs at least 60 seconds of length and a non-zero level': '譜面時長需至少 60 秒且等級不能為 0（請先儲存資訊）',
        'Save the chart info before promoting': '請先儲存譜面資訊再推廣',
        'Not enough gold for promotion': '金幣不足，推廣需要 {{price}} 金幣',
        'Please wait 24 hours before promoting again': '24 小時內只能推廣一次，請稍後再試',
        'Promotion failed, please try again later': '推廣失敗，請稍後重試',
    },
    'ja': {
        'Session expired, please sign in again': 'ログインの有効期限が切れました。再度ログインしてください',
        'Only the chart author can promote a non-Stable chart': '譜面の作者のみプロモーションできます（Stable 譜面は不可）',
        'Chart length must be at least 60 seconds': '譜面の長さは 60 秒以上必要です',
        'Please set a level before promoting': 'プロモーション前にレベルを設定してください',
        'The chart needs at least 60 seconds of length and a non-zero level': '譜面の長さは 60 秒以上、レベルは 1 以上必要です（情報を保存してください）',
        'Save the chart info before promoting': 'プロモーション前に譜面情報を保存してください',
        'Not enough gold for promotion': 'ゴールドが足りません（{{price}} ゴールド必要）',
        'Please wait 24 hours before promoting again': '24 時間以内に再度プロモーションすることはできません',
        'Promotion failed, please try again later': 'プロモーションに失敗しました。しばらくしてからお試しください',
    },
}

for code, extra in PROMOTE_MESSAGES.items():
    OVERRIDES[code].update(extra)


def unquote(token):
    try:
        return ast.literal_eval(token.strip())
    except Exception:
        return token.strip().strip('"')


def parse_po(path):
    entries = []
    cur = None
    field = None
    fuzzy = False

    def flush():
        nonlocal cur
        if cur is None:
            return
        if cur.get('msgid') and not fuzzy and cur.get('msgstr'):
            entries.append((cur['msgid'], cur['msgstr']))
        cur = None

    with open(path, encoding='utf-8') as f:
        for raw in f:
            s = raw.strip()
            if s.startswith('#'):
                if 'fuzzy' in s:
                    fuzzy = True
                continue
            if not s:
                flush()
                field = None
                fuzzy = False
                continue
            if s.startswith('msgid_plural '):
                field = 'plural'
                continue
            if s.startswith('msgid '):
                if cur is not None:
                    flush()
                    fuzzy = False
                cur = {'msgid': unquote(s[len('msgid '):]), 'msgstr': ''}
                field = 'msgid'
                continue
            if s.startswith('msgstr['):
                idx = s.find(']')
                if cur is not None and s.startswith('msgstr[0]'):
                    cur['msgstr'] = unquote(s[idx + 1:].strip())
                field = 'pluralstr'
                continue
            if s.startswith('msgstr '):
                if cur is not None:
                    cur['msgstr'] = unquote(s[len('msgstr '):])
                field = 'msgstr'
                continue
            if s.startswith('"') and cur is not None and field in ('msgid', 'msgstr', 'plural'):
                cur[field] = cur.get(field, '') + unquote(s)
    flush()
    return entries


def main():
    result = {}
    for code, folder in PO_DIRS.items():
        path = os.path.join(LOCALE, folder, 'LC_MESSAGES', 'django.po')
        result[code] = dict(parse_po(path))
        print(f'{code:8s} {folder:8s} {len(result[code]):4d} translated entries')

    for code, extra in OVERRIDES.items():
        result[code].update(extra)

    result['en'] = dict(OVERRIDES['en'])

    header = (
        "import type { Locale } from './i18nTypes'\n\n"
        'export const translations: Record<Locale, Record<string, string>> = '
    )
    body = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(header + body + '\n\nexport default translations\n')
    print('wrote', OUT, os.path.getsize(OUT), 'bytes')


if __name__ == '__main__':
    main()
