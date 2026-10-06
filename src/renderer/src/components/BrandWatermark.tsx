import logoUrl from '../assets/logo.svg'

/**
 * 编辑器右下角的轻量品牌水印。
 * - 自适应宽度：视口越宽越大（80–120px），但永远不抢主角
 * - 半透明 + 灰度：与正文保持层级
 * - pointer-events: none：不挡光标、不接收点击
 */
export default function BrandWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none fixed z-10 flex items-end"
      style={{
        right: 'clamp(14px, 2vw, 28px)',
        bottom: 'clamp(36px, 4vh, 56px)',
        opacity: 0.45
      }}
    >
      <img
        src={logoUrl}
        alt="付小付"
        title="www.fuxiaoyu.cn"
        draggable={false}
        className="block"
        style={{
          width: 'clamp(72px, 7vw, 120px)',
          height: 'auto',
          filter: 'grayscale(35%)'
        }}
      />
    </div>
  )
}