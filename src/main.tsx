import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// antd样式导入 - 使用V5的正确导入方式
import 'antd/dist/reset.css'

// 引入本地化配置，确保在应用开始就初始化
import './config/localeConfig'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
