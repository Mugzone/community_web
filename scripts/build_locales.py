"""Regenerate src/locales.ts from the old Django site's .po catalogs.

    python3 scripts/build_locales.py

Key = the English msgid verbatim from the old site. A missing key or an empty
msgstr falls back to that English key at runtime -- no text is invented here.
Vietnamese (vi) is intentionally omitted; only zh-hans / zh-hant / en / ja
are shipped.
"""
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

# 老站 .po 里 msgstr 为空 / 被 fuzzy 跳过的条目，以及 v3 新增的文案。
# 不补齐的话 t() 会回落成 key 本身，例如注册按钮显示 "START::DASH"。
# 这里只补这些缺口，不改写 .po 里已有的有效翻译。
OVERRIDES = {
    'en': {
        'START::DASH': "Let's go!",
        'reg_success': 'Registered! Please check your email for the activation link.',
    },
    'zh-hans': {
        'START::DASH': '开始吧!!',
        'reg_success': '注册成功，请检查邮箱以激活帐号',
        'Never': '从未',
        # 老站 profile/index.html:122 硬编码英文，v3 新增文案
        'No score record': '暂无成绩记录',
        # wiki 页「推送新闻」（web-v2 wiki.manage.* 的对应文案）
        'Push news': '推送新闻',
        'News published.': '新闻已上线。',
        'News unpublished.': '新闻已下线。',
        'You do not have permission to push news.': '没有权限推送新闻。',
        # 玩家主页「徽章」tab（v2 player-labels）
        'Badge': '徽章',
        'No badges': '暂无徽章',
    },
    'zh-hant': {
        'START::DASH': '開始吧!!',
        'reg_success': '註冊成功，請檢查信箱以啟用帳號',
        # 老站 .po 这些条目为空或是 fuzzy 的旧 msgid（"Player"/"Charts list"）
        # 过时错译，parse_po 会跳过；按简体/日文既有语义补齐。
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
    },
    'ja': {
        'START::DASH': 'スタート::ダッシュ!!',
        'reg_success': '登録しました。認証メールをご確認ください',
        # 老站 .po 的 "Played" 是 fuzzy 的旧 msgid "Player" 译文「プレイヤー」
        'Played': 'プレイ時間',
        'Never': 'なし',
        'No score record': 'スコア記録なし',
        'Push news': 'ニュースを公開',
        'News published.': 'ニュースを公開しました。',
        'News unpublished.': 'ニュースを非公開にしました。',
        'You do not have permission to push news.': 'ニュースを公開する権限がありません。',
        'Badge': 'バッジ',
        'No badges': 'バッジなし',
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
        '{{count}} events': '共 {{count}} 个活动',
        'Retry': '重试',
        'Only organization members can save events': '仅组织成员可保存活动',
        'Invalid chart ID': '谱面 ID 无效',
        'Duplicate chart': '谱面已添加',
        'View event': '查看活动',
        'Invalid event type': '活动类型无效',
        'Invalid wiki page': 'Wiki 页面 ID 无效',
        'Editing is available for active account': '需要登录有效账号才能编辑',
        'Combo': '连击数',
        'Name': '名称',
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
        '{{count}} events': '共 {{count}} 個活動',
        'Retry': '重試',
        'Only organization members can save events': '僅組織成員可儲存活動',
        'Invalid chart ID': '譜面 ID 無效',
        'Duplicate chart': '譜面已新增',
        'View event': '查看活動',
        'Invalid event type': '活動類型無效',
        'Invalid wiki page': 'Wiki 頁面 ID 無效',
        'Editing is available for active account': '需要登入有效帳號才能編輯',
        'Upload image': '上傳圖片',
        'Cover': '封面',
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
        '{{count}} events': '{{count}} 件のイベント',
        'Retry': '再試行',
        'Only organization members can save events': '組織メンバーのみイベントを保存できます',
        'Invalid chart ID': '譜面 ID が無効です',
        'Duplicate chart': '譜面は既に追加されています',
        'View event': 'イベントを見る',
        'Invalid event type': 'イベントの種類が無効です',
        'Invalid wiki page': 'Wiki ページ ID が無効です',
    },
}

for code, extra in EVENT_MESSAGES.items():
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

    # English is the runtime fallback: t() returns the key itself.
    # 只保留显式补充的条目，其余英文 key 本身就是正确文案。
    result['en'] = dict(OVERRIDES['en'])

    header = (
        '/* AUTO-GENERATED by scripts/build_locales.py from\n'
        ' * maweb-django/web/locale/<lang>/LC_MESSAGES/django.po. Do not hand-edit.\n'
        ' * Key = English msgid from the old site; a missing key or empty translation\n'
        ' * falls back to that English key at runtime. Vietnamese (vi) is omitted.\n'
        ' */\n'
        "import type { Locale } from './i18n'\n\n"
        'export const translations: Record<Locale, Record<string, string>> = '
    )
    body = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(header + body + '\n\nexport default translations\n')
    print('wrote', OUT, os.path.getsize(OUT), 'bytes')


if __name__ == '__main__':
    main()
