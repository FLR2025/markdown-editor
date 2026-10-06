import React from 'react'
import ReactDOM from 'react-dom/client'
import './webApiMock' // Web 兼容层：注入 mock Electron API
import App from './App'
import './index.css'

// React 挂载前 index.html 里有 #boot 占位动画，第一帧渲染完就立即淡出
function hideBoot(): void {
  const el = document.getElementById('boot')
  if (!el) return
  el.classList.add('hidden')
  // 给 250ms 动画播完再彻底移除，避免偶发的卡帧
  setTimeout(() => el.remove(), 260)
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// 渲染立即同步触发，不依赖 setTimeout（避免 dev 模式下 StrictMode 双渲染的抖动）
hideBoot()
