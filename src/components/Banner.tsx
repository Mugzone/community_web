import type { BannerItem } from '../types/content'
import { useI18n } from '../i18n'

type BannerProps = {
  items: BannerItem[]
}

function Banner({ items }: BannerProps) {
  const { t } = useI18n()

  return (
    <div className="banner">
      {items.map((item) => (
        <a className="banner-card" href={item.link} key={item.title}>
          <div className="banner-overlay" />
          <img className="banner-img" src={item.image} alt={item.title} />
          <div className="banner-text">
            <p className="eyebrow">{t('banner.featured')}</p>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        </a>
      ))}
    </div>
  )
}

export default Banner
