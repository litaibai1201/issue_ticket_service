import axios from 'axios'

const instance = axios.create({
  baseURL: import.meta.env.VITE_HOST,
  headers: {
    'Content-Type': 'application/json'
  }
})

instance.interceptors.request.use(function (config) {
  if (config.url?.startsWith(import.meta.env.VITE_HOST)) {
    return config
  }

  const token = localStorage.getItem('token')
  config.headers.Authorization = `Bearer ${token}`
  
  // 打印请求详情，特别是如果是 GET 请求带有参数
  if (config.method === 'get' && config.params) {
    console.log('发送请求到:', config.url)
    console.log('请求参数:', config.params)
  }
  
  return config
})

// 添加响应拦截器
/*
instance.interceptors.response.use(
  response => {
    console.log('接收到响应:', response.config.url)
    return response
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)
*/

export default instance
