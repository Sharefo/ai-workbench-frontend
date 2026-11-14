import { useEffect, useRef } from 'react'

/**
 * 「进入 SQL 实验室」入口：动态装满猫粮的猫粮碗。
 * 常态：碗体循环视频 + 深色按钮浮在猫粮上方；
 * Hover：碗上浮、按钮蓝色描边亮起；
 * 点击：直接切换到 SQL 实验室（无过场动画）。
 */
export function CatFoodEntry({ onEnter }: { onEnter: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  /* 显式播放：与首屏轮播视频并存时，部分浏览器会拦第二个 autoplay */
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.setAttribute('muted', '')
    v.setAttribute('playsinline', '')
    v.play().catch(() => undefined)
  }, [])

  return (
    <button
      type="button"
      className="cat-entry"
      onClick={onEnter}
      aria-label="进入 SQL 实验室"
    >
      <video
        ref={videoRef}
        className="cat-entry-video"
        src="/assets/home/bowl-loop.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      />
      <span className="cat-entry-shade" aria-hidden />
      <span className="cat-entry-content">
        <span className="cat-entry-pill">进入 SQL 实验室 <i>→</i></span>
      </span>
    </button>
  )
}
