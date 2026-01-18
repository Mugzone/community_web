import type { ImgHTMLAttributes } from 'react'
import { avatarFallbackUrl } from '../utils/formatters'

type AvatarImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  seed?: string | number
}

const AvatarImage = ({ seed, onError, src, ...props }: AvatarImageProps) => {
  const fallback = avatarFallbackUrl(seed ?? src)
  return (
    <img
      {...props}
      src={src}
      onError={(event) => {
        const target = event.currentTarget
        if (target.dataset.avatarFallbackApplied) return
        target.dataset.avatarFallbackApplied = 'true'
        target.onerror = null
        if (target.src !== fallback) target.src = fallback
        onError?.(event)
      }}
    />
  )
}

export default AvatarImage
