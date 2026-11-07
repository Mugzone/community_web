import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Shell } from '../../components/Layout'
import { asArray, formatTime, num, showNotify, useLoad } from '../../lib/legacy'
import { staticUrl, URLS } from '../../lib/urls'
import {
  deleteSkin, fetchSkinDetail, fetchTalkList, purchaseSkin, saveTalk,
} from '../../network/legacy'

const MODE_LABELS = ['Key', 'Step', 'DJ', 'Catch', 'Pad', 'Taiko', 'Ring', 'Slide', 'Live', 'Cube']
const PLATFORM_LABELS = ['PC', 'Pad Horizontal', 'Pad Portrait', 'Phone Horizontal', 'Phone Portrait']

type TalkItem = {
  tid?: number | string
  uid?: number | string
  name?: string
  time?: number | string
  content?: string
  num?: number | string
  type?: number
  avatar?: string
  isOwn?: boolean
  canEdit?: boolean
  canDel?: boolean
}

const TALK_TOOLS: { type: string; cls: string; title: string }[] = [
  { type: 'bold', cls: 'tool-B', title: 'Bold' },
  { type: 'italic', cls: 'tool-I', title: 'Italic' },
  { type: 'list', cls: 'tool-list', title: 'List' },
  { type: 'img', cls: 'tool-img', title: 'Image' },
  { type: 'link', cls: 'tool-link', title: 'Link' },
]

export default function SkinDetail() {
  const params = useParams<{ sid?: string }>()
  const sid = params.sid
    ?? new URLSearchParams(window.location.search).get('id')
    ?? window.location.pathname.split('/').pop()
    ?? ''

  const { data: detail } = useLoad<Record<string, any>>(
    async () => {
      const resp = await fetchSkinDetail(sid)
      return (resp?.data ?? resp ?? {}) as Record<string, any>
    },
    [sid],
    {} as Record<string, any>,
  )

  const talkKey = `skin_${sid}`
  const [talkPage, setTalkPage] = useState(0)
  const { data: talkItems, reload: reloadTalk } = useLoad<TalkItem[]>(
    async () => {
      const resp = await fetchTalkList({ topic: talkKey, order: -1, from: talkPage })
      const d: any = resp?.data ?? resp ?? {}
      return asArray<TalkItem>(d?.list ?? d?.items ?? d)
    },
    [talkKey, talkPage],
    [] as TalkItem[],
  )

  const [bought, setBought] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [content, setContent] = useState('')

  const skin: any = detail?.skin ?? detail ?? {}
  const id = skin.id ?? sid
  const name = String(skin.name ?? '')
  const coverBg = String(skin.cover_url ?? skin.cover ?? '') || '/static/img/cover.png'
  const price = num(skin.price, 0)
  const stat = num(skin.status, 0)
  const author: any = skin.author ?? {}
  const authorId = author.id ?? skin.author_id ?? ''
  const authorName = author.username ?? skin.author_name ?? ''
  const platArr = asArray<number>(detail?.plat_arr ?? skin.plat_arr ?? [])
  const modeArr = asArray<number>(detail?.mode_arr ?? skin.mode_arr ?? [])
  const previewArr = asArray<string>(detail?.preview_arr ?? skin.preview_arr ?? [])
  const desc = String(detail?.desc ?? skin.desc ?? '')
  const key = String(detail?.key ?? talkKey)
  const canEdit = !!(detail?.can_edit ?? skin.can_edit)
  const canDelete = !!(detail?.can_delete ?? skin.can_delete)
  const haslink = !!(detail?.haslink ?? skin.haslink ?? skin.link)
  const needLogin = !!(detail?.need_login ?? skin.need_login)
  const notEnough = !!(detail?.not_enough_credit ?? skin.not_enough_credit)
  const mav = !!(detail?.mav ?? skin.mav)
  const thumbParam = String(detail?.thumb_param ?? skin.thumb_param ?? '')
  const downUrl = String(detail?.downUrl ?? skin.downUrl ?? skin.link ?? '')
  const downName = String(detail?.downName ?? skin.downName ?? '')
  const purchased = bought || !!(detail?.purchased ?? skin.purchased)

  const onBuy = async () => {
    if (notEnough) {
      showNotify("You don't have enough credits to purchase this skin", 'err')
      return
    }
    try {
      await purchaseSkin(sid)
      showNotify('Skin purchased successfully!', 'succ')
      setBought(true)
    } catch {
      showNotify('Purchase failed', 'err')
    }
  }

  const onDelete = async () => {
    if (!window.confirm("Are you sure to delete this skin? This operation can't be undone")) return
    try {
      await deleteSkin(sid)
      window.location.href = '/store/skin'
    } catch {
      showNotify('Delete failed', 'err')
    }
  }

  const onDescEdit = () => {
    window.location.href = `/wiki/edit?key=${key}`
  }

  const openEditor = (text = '') => {
    setContent(text)
    setEditorOpen(true)
  }

  const onSaveTalk = async () => {
    const text = content.trim()
    if (!text) return
    try {
      await saveTalk({ key: talkKey, content: text, hasOwner: 1 })
      setContent('')
      setEditorOpen(false)
      reloadTalk()
    } catch {
      showNotify('Server error', 'err')
    }
  }

  const perform = (type: string) => {
    const inserts: Record<string, string> = {
      bold: '** content **', italic: '// content //',
      list: '* list item 1\n* list item 2', img: '[img:your image link here]',
      link: '[http://your_link.com  title]',
    }
    setContent((c) => c + (inserts[type] ?? ''))
  }

  const renderTalkItem = (t: TalkItem, idx: number) => {
    const tid = t.tid ?? idx
    const uid = t.uid ?? ''
    const showName = String(t.name ?? '')
    const showTime = formatTime(t.time)
    const body = String(t.content ?? '')
    if (t.type === 1) {
      // talk/like.tmpl.html
      return (
        <li className="item small" data-id={tid} data-time={t.time} key={`${tid}-${idx}`}>
          <div className="bg right">
            <div className="g_wiki meta">
              <a href={URLS.user(uid)} className="name">{showName}</a>
              {body}
              <span className="time">{showTime}</span>
              <span className="clear"></span>
            </div>
          </div>
        </li>
      )
    }
    // talk/item.tmpl.html
    return (
      <li className="item" data-id={tid} data-time={t.time} key={`${tid}-${idx}`}>
        <a className="bg left" href={URLS.user(uid)}>
          {t.avatar
            ? <img src={`http://cni.mugzone.net/avatar/${t.avatar}`} style={{ background: 'none' }} alt="" />
            : <img alt="" />}
        </a>
        <div className="bg right">
          <div className="g_wiki">
            <p className="meta">
              {t.num ? <span className="num">{t.num}</span> : null}
              <a href={URLS.user(uid)} className="name">{showName}</a>
              <span className="time">{showTime}</span>
              {!t.isOwn && (
                <a href="#" data-type="reply" title="Reply" className="tool" onClick={(e) => { e.preventDefault(); openEditor(`@${showName} `) }}>Reply</a>
              )}
              {t.canEdit && (
                <a href="#" data-type="edit" title="Edit" className="tool" onClick={(e) => { e.preventDefault(); openEditor(body) }}>Edit</a>
              )}
              {t.canDel && (
                <a href="#" data-type="del" title="Delete" className="tool" onClick={(e) => { e.preventDefault(); showNotify('Delete success!', 'succ') }}>Delete</a>
              )}
            </p>
            {body}
            <span className="clear"></span>
            <p className="tool"></p>
          </div>
        </div>
      </li>
    )
  }

  return (
    <Shell variant="wide" title={`Skins - ${name}`} css={['skin_detail.css', 'wiki.css']}>
      <div className="song_title g_rblock">
        <div className="coverb">
          <div className="cover" style={{ backgroundImage: `url(${coverBg})` }}></div>
        </div>
        <div className="tail">
          <a href={URLS.skin}>Back to skin list</a>
        </div>
        <div id="tool_skin" style={{ zIndex: 10 }}>
          {canEdit && (
            <a href={`/store/skin/entry?id=${id}`} className="btn g_toolbtn e" title="Edit skin"><i></i></a>
          )}
          {canDelete && (
            <a href="#" className="btn g_toolbtn d" data-type="del" title="Delete" onClick={(e) => { e.preventDefault(); void onDelete() }}><i></i></a>
          )}
          <a href={`/page/change?key=${key}`} className="g_toolbtn log" title="Change History"><i></i></a>
        </div>
        {haslink && (
          <div id="btn_skin" style={{ zIndex: 10 }}>
            {needLogin ? (
              <a href="#login" id="link_login" className="g_btn login" onClick={(e) => { e.preventDefault(); showNotify('Please login', 'err') }}>Login to purchase</a>
            ) : purchased && !bought ? (
              <a href={downUrl} className="g_btn download" download={downName}>Download skin</a>
            ) : (
              <>
                <a
                  href="#" id="link_purchase" data-type="buy"
                  className={`g_btn btn download${notEnough ? ' disabled' : ''}`}
                  style={{ display: bought ? 'none' : undefined }}
                  onClick={(e) => { e.preventDefault(); void onBuy() }}
                >{price ? `${price} Gold` : 'Free'}</a>
                <a href={downUrl} className="g_btn download" download={downName} id="link_download" style={{ display: bought ? undefined : 'none' }}>Download skin</a>
              </>
            )}
          </div>
        )}
        <div className="right">
          <h2 className="textfix title">
            {stat === 2 ? <em className="t2">Stable</em> : stat === 1 ? <em className="t1">Beta</em> : <em className="t0">Alpha</em>}
            {mav && <em className="mav">MalodyV</em>}
            {name}
          </h2>
          <h2 className="sub">
            <label>Author</label>:<a href={URLS.user(authorId)}>{authorName}</a>
            <label>Price</label>:<span>{price ? price : 'free'}</span>
            <label>Status</label>:<span>{stat === 0 ? 'Draft' : stat === 1 ? 'Beta' : stat === 2 ? 'Stable' : ''}</span>
          </h2>
          <h2 className="sub">
            <label>Version</label>:<span>{String(skin.version ?? '')}</span>
            <label>Last update</label>:<span>{String(skin.update_str ?? '')}</span>
            {!!skin.client && <><label>Required</label>:<span>{String(skin.client)}</span></>}
            {!!skin.clientmax && <>&nbsp;-&nbsp;<span>{String(skin.clientmax)}</span></>}
          </h2>
          <h2 className="sub">
            <label>Support platforms:</label>
            <span className="platform-list">
              {platArr.map((i) => (
                <img data-index={i} className="platform" key={i} src={staticUrl(`img/platform/plat-${i}.png`)} title={PLATFORM_LABELS[i] ?? ''} alt="" />
              ))}
            </span>
          </h2>
          <h2 className="sub">
            <label>Support modes</label>:
            <span className="mode-list">
              {modeArr.map((i) => (
                <img data-index={i} className="mode" key={i} src={staticUrl(`img/mode/mode-${i}.png`)} title={MODE_LABELS[i] ?? ''} alt="" />
              ))}
            </span>
          </h2>
        </div>
      </div>

      {previewArr.length > 0 && (
        <div className="g_rblock g_cont2 g_wiki">
          <h2>Preview images</h2>
          <div id="preview">
            {previewArr.map((img) => (
              <a
                className="img" key={img}
                style={{ backgroundImage: `url(http://cni.machart.top/${img}${thumbParam})` }}
                href={`http://cni.mugzone.net/${img}`} target="_blank" rel="noreferrer"
              ></a>
            ))}
          </div>
        </div>
      )}

      <div className="g_cont2 g_rblock">
        <div className="tool">
          <a href="#" className="btn g_toolbtn e" data-type="edit" title="Edit" onClick={(e) => { e.preventDefault(); onDescEdit() }}><i></i></a>
        </div>
        <div className="g_wiki">
          {desc
            ? desc
            : <div className="g_wiki_new btn" data-type="edit" onClick={onDescEdit}>Add description</div>}
          <span className="clear"></span>
        </div>
      </div>

      <div className="g_talk" id="g_talk">
        <div id="g_talk_input" style={{ display: editorOpen ? 'block' : 'none' }}>
          <div className="wrap">
            <div className="desc">Notice: You are in public talk, please use English</div>
            <div className="tool">
              <div className="g_edittool">
                {TALK_TOOLS.map((t) => (
                  <a href="#" data-type={t.type} key={t.type} onClick={(e) => { e.preventDefault(); perform(t.type) }}>
                    <span title={t.title} className={t.cls}></span>
                  </a>
                ))}
                <em className="clear"></em>
              </div>
              <a href="#" className="btn" data-type="cancel" id="J_cancel" onClick={(e) => { e.preventDefault(); setEditorOpen(false) }}>X</a>
            </div>
            <textarea cols={80} rows={30} dir="ltr" value={content} onChange={(e) => setContent(e.target.value)}></textarea>
            <p>
              <a className="g_btn btn g_talk_new" data-type="save" id="g_talk_save" href="#" onClick={(e) => { e.preventDefault(); void onSaveTalk() }}>Reply</a>
            </p>
          </div>
        </div>
        <div className="g_talk_tool">
          <div className="g_btn btn g_talk_new" data-type="new" onClick={() => openEditor()}><i></i>Reply</div>
        </div>
        <ul id="g_talk_list">
          {talkItems.map(renderTalkItem)}
        </ul>
        <div id="g_talk_next" data-type="next" className="talk_btn btn" onClick={() => { setTalkPage((p) => p + 1) }}>Show more</div>
        <div className="g_talk_new_rep" id="g_talk_new2">
          <p>Want to say something?</p>
          <div className="g_btn btn g_talk_new" data-type="new" onClick={() => openEditor()}><i></i>Reply</div>
        </div>
      </div>
    </Shell>
  )
}
