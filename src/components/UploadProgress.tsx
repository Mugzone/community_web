/** 上传进度条。percent 为 null 时不渲染；样式内联，避免各页面各自引入 CSS。 */
export default function UploadProgress({ percent }: { percent: number | null }) {
  if (percent === null) return null
  const value = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', fontSize: 12, opacity: 0.85 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(127,127,127,.25)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            background: '#3a9d6e',
            borderRadius: 3,
            transition: 'width .15s linear',
          }}
        />
      </div>
      <span style={{ minWidth: 40, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}
