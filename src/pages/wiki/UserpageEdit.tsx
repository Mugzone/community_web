import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Shell, DefaultSidebar } from '../../components/Layout'
import { useLoad, showNotify } from '../../lib/legacy'
import { URLS } from '../../lib/urls'
import { fetchUserPageWiki, saveUserPageWiki } from '../../network/legacy'

type Model = { title: string; content: string }
const FALLBACK: Model = { title: '', content: '' }

type Tool = { type: string; title: string; cls: string }
const TOOLS: Tool[] = [
  { type: 'bold', title: 'Bold', cls: 'tool-B' },
  { type: 'italic', title: 'Italic', cls: 'tool-I' },
  { type: 'h1', title: '1st level Heading', cls: 'tool-H1' },
  { type: 'h2', title: '2nd level Heading', cls: 'tool-H2' },
  { type: 'h3', title: '3rd level Heading', cls: 'tool-H3' },
  { type: 'list', title: 'List', cls: 'tool-list' },
  { type: 'img', title: 'Image', cls: 'tool-img' },
  { type: 'link', title: 'Link', cls: 'tool-link' },
  { type: 'table', title: 'Table', cls: 'tool-table' },
]

/** /page/userpage/edit/<id> —— 老站 userpage_edit.html + module/wiki_edit（用户主页 wiki 编辑） */
export default function UserpageEdit() {
  const { id = '' } = useParams()
  const [content, setContent] = useState('')
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const { data } = useLoad<Model>(
    async () => {
      const resp: any = await fetchUserPageWiki(id)
      const p: any = resp?.data ?? resp
      return {
        title: String(p?.title ?? ''),
        content: String(p?.content ?? p?.raw ?? ''),
      }
    },
    [id],
    FALLBACK,
  )

  useEffect(() => setContent(data.content ?? ''), [data.content])

  const save = async () => {
    try {
      await saveUserPageWiki(id, content)
      window.history.back()
    } catch {
      showNotify('Failed to save, please try again later.', 'err')
    }
  }

  const perform = (type: string) => {
    const el = editorRef.current
    const start = el?.selectionStart ?? content.length
    const end = el?.selectionEnd ?? content.length
    const selected = content.slice(start, end) || ' content '
    let snippet = ''
    switch (type) {
      case 'bold': snippet = `**${selected}**`; break
      case 'italic': snippet = `//${selected}//`; break
      case 'h1': snippet = `=${selected}=`; break
      case 'h2': snippet = `==${selected}==`; break
      case 'h3': snippet = `===${selected}===`; break
      case 'list': snippet = '* list item 1\n* list item 2'; break
      case 'img': snippet = '[img:your image link here]'; break
      case 'link': snippet = '[http://your_link.com  title]'; break
      case 'table': snippet = '|-\n|! title | title | title |\n| value | value | value |'; break
      default: snippet = selected
    }
    setContent(content.slice(0, start) + snippet + content.slice(end))
  }

  return (
    <Shell
      variant="two-col"
      css={['wiki_edit.css']}
      sidebar={
        <>
          <DefaultSidebar />
          <h4>Help</h4>
          <a href={URLS.wiki(2)}>Markup Tutorial</a>
        </>
      }
    >
      <div className="g_title">Editing:{'\u00a0'}{data.title}</div>
      <div className="g_cont">
        <div className="g_actbar" style={{ marginLeft: 10 }}>
          <a href={URLS.user(id)} className="g_btn">Cancel</a>
        </div>
        <h1 className="msg">Your are editing this page, sidebar has some articles for you to learn our markup language and our edit principles.</h1>
        <div className="g_edittool">
          {TOOLS.map((t) => (
            <a key={t.type} href="#" data-type={t.type} onClick={(e) => { e.preventDefault(); perform(t.type) }}>
              <span title={t.title} className={t.cls}></span>
            </a>
          ))}
          <em className="clear"></em>
        </div>
        <div className="edit">
          <textarea
            name="edit"
            id="J_edit"
            cols={80}
            rows={30}
            dir="ltr"
            ref={editorRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="button">
          <div className="g_btn btn" data-type="save" onClick={() => void save()}>Save</div>
          <a href="#" className="btn" data-type="cancel" onClick={(e) => { e.preventDefault(); window.history.back() }}>Cancel</a>
        </div>
        <div className="g_tip">
          <span>Saving...</span>
          <span className="err">Failed to save, please try again later.</span>
          <span className="err">Please check the information field.<em></em></span>
          <span className="err">Please check the category, read category guide if need help.</span>
          <span className="err">You are not permitted to edit this page.</span>
        </div>
        <div className="preview" id="J_preview">
          <h1 className="msg">Preview</h1>
          <div className="g_wiki"></div>
        </div>
      </div>
    </Shell>
  )
}
