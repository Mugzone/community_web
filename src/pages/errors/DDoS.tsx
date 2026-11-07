import { Shell } from '../../components/Layout'

/** ddos.html（base_simple.html） */
export default function DDoS() {
  return (
    <Shell variant="simple" css={['akari.css']} simpleFrame>
      <div id="center">
        <div id="content">
          <div className="g_cont2 g_rblock" style={{ padding: 10 }}>
            <p>You don't have permission for the page, ask admin for help</p>
          </div>
        </div>
      </div>
    </Shell>
  )
}
