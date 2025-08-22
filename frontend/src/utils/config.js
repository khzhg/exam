
export const API_BASE =
  window.location.hostname.includes('localhost') || 
  window.location.hostname.includes('127.0.0.1')
    ? 'http://localhost:3001/api' // 开发环境地址
    : `${window.location.protocol}//${window.location.host}/api`; // 生产环境自动拼接,需要nginx代理到正确的端口
/*
  * 使用示例：
  * 
  * import { API_BASE } from '@/config';
  * 
  * // 在组件或其他模块中使用
  * fetch(`${API_BASE}/users`)
  *   .then(response => response.json())
  *   .then(data => console.log(data))
  *   .catch(error => console.error('Error:', error));
  * 
  
*/


// 这是还可以增加其他全局配置
/*export const APP_CONFIG = 
{
  enableDebug: window.location.hostname.includes('localhost'),
  timeout: 5000
}
  */
