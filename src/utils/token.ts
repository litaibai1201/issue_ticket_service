// src/utils/token.ts

interface TokenPayload {
  sub: string;
  work_no: string;
  name?: string;
  role?: string;
  exp: number;
}

/**
 * 解析JWT Token获取其中的payload数据
 * @param token JWT Token字符串
 * @returns 解析后的payload数据，解析失败则返回null
 */
export const parseToken = (token: string): TokenPayload | null => {
  try {
    // JWT Token由三部分组成，以.分隔，第二部分为payload
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Base64解码payload部分
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    
    // 处理Base64解码
    let decodedData;
    try {
      // 标准的Base64解码
      decodedData = window.atob(base64);
    } catch (e) {
      console.error('Base64 decode error:', e);
      return null;
    }
    
    // 将解码后的数据转换为JSON
    try {
      const jsonStr = decodeURIComponent(
        Array.from(decodedData)
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('JSON parse error:', e);
      return null;
    }
  } catch (error) {
    console.error('Token parsing error:', error);
    return null;
  }
};

/**
 * 获取当前用户的工号
 * @returns 工号字符串，未登录则返回null
 */
export const getUserWorkNo = (): string | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  const payload = parseToken(token);
  if (!payload) return null;
  
  // 先检查work_no字段，如果有就返回
  if (payload.work_no) return payload.work_no;
  
  // 检查sub是否为字符串工号
  if (typeof payload.sub === 'string') return payload.sub;
  
  // 检查sub对象中是否有empid属性
  if (payload.sub && typeof payload.sub === 'object' && 'empid' in payload.sub) {
    return payload.sub.empid;
  }
  
  return null;
};

/**
 * 获取当前用户信息
 * @returns 用户信息对象
 */
export const getUserInfo = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  return parseToken(token);
};

/**
 * 检查token是否有效(未过期)
 * @returns boolean 是否有效
 */
export const isTokenValid = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  const payload = parseToken(token);
  if (!payload) return false;
  
  // 检查是否过期，exp字段为过期时间戳(秒)
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
};
