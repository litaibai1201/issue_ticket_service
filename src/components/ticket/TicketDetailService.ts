import { message } from 'antd';
import { getTicketById, getTicketLogs, getServiceName, searchUserNames, updateTicket } from '../../api';
import { Ticket, TicketLog } from '../../types';
import ticketStore from '../../store/ticketStore';
import { TicketFormValues } from './TicketForm';
import { handleWorkNoSearch as handleWorkNoSearchBase } from './WorkNoSearch';

/**
 * 加载工单数据
 */
export const fetchTicketData = async (
  ticketId: number,
  setTicket: (ticket: Ticket) => void,
  setLoading: (loading: boolean) => void,
  setServiceName: (name: string) => void,
  setUserNameMap: (map: Record<string, string>) => void,
  fetchUserNames: (ticket: Ticket) => Promise<void>,
  fetchTicketLogs: (ticketId: number) => Promise<void>,
  formRef: React.MutableRefObject<any>
) => {
  setLoading(true);
  try {
    // 获取工单信息
    const ticketResponse = await getTicketById(ticketId);
    
    // 判断数据结构
    let ticketData;
    if (ticketResponse.data && ticketResponse.data.content) {
      // 如果数据在content字段中
      ticketData = ticketResponse.data.content;
    } else if (ticketResponse.data) {
      // 如果数据直接在data字段中
      ticketData = ticketResponse.data;
    } else {
      throw new Error('无法解析工单数据');
    }
    
    setTicket(ticketData);
    
    // 如果有service_token，获取服务名称
    if (ticketData.service_token) {
      await fetchServiceName(ticketData.service_token, setServiceName);
    }
    
    // 将工单数据保存到store
    ticketStore.setCurrentTicket(ticketData);
    
    // 设置表单初始值
    formRef.current.setFieldsValue({
      is_true: ticketData.is_true,
      is_need: ticketData.is_need,
      status: ticketData.status,
      responsible: ticketData.responsible,
      // 处理人使用labelInValue模式，需要转换成对象数组
      handler: Array.isArray(ticketData.handler) ? ticketData.handler.map(workno => ({
        key: workno,
        value: workno,
        label: ticketStore.getCachedUserName(workno) || workno
      })) : []
    });
    
    // 加载用户名称
    await fetchUserNames(ticketData);
    
    // 获取工单日志
    await fetchTicketLogs(ticketId);
  } catch (error) {
    console.error('Failed to fetch ticket data:', error);
    message.error('获取工单数据失败');
  } finally {
    setLoading(false);
  }
};

/**
 * 获取服务名称
 */
export const fetchServiceName = async (
  serviceToken: string,
  setServiceName: (name: string) => void
) => {
  try {
    const response = await getServiceName(serviceToken);
    if (response.data && response.data.content) {
      setServiceName(response.data.content);
    }
  } catch (error) {
    console.error('Failed to fetch service name:', error);
  }
};

/**
 * 获取用户名称
 */
export const fetchUserNames = async (
  ticket: Ticket,
  setUserNameMap: (map: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
) => {
  // 从 store 引入缓存的用户名称
  const allEmpIds = new Set<string>();
  const newUserNameMap: Record<string, string> = {};
  
  // 先检查缓存中是否有这些用户名称
  if (ticket.responsible && Array.isArray(ticket.responsible)) {
    ticket.responsible.forEach(empid => {
      if (empid && empid.trim() !== '') {
        const cachedName = ticketStore.getCachedUserName(empid);
        if (cachedName) {
          newUserNameMap[empid] = cachedName;
        } else {
          allEmpIds.add(empid);
        }
      }
    });
  }
  
  if (ticket.handler && Array.isArray(ticket.handler)) {
    ticket.handler.forEach(empid => {
      if (empid && empid.trim() !== '') {
        const cachedName = ticketStore.getCachedUserName(empid);
        if (cachedName) {
          newUserNameMap[empid] = cachedName;
        } else {
          allEmpIds.add(empid);
        }
      }
    });
  }
  
  // 如果还有未缓存的用户名称，则调用 API 获取
  if (allEmpIds.size > 0) {
    try {
      const empIdsArray = Array.from(allEmpIds);
      const response = await searchUserNames(empIdsArray);
      
      if (response.data && response.data.content) {
        const apiUserNameMap = response.data.content;
        
        // 将 API 返回的用户名称缓存到 store
        Object.keys(apiUserNameMap).forEach(empid => {
          ticketStore.cacheUserName(empid, apiUserNameMap[empid]);
          newUserNameMap[empid] = apiUserNameMap[empid];
        });
      }
    } catch (error) {
      console.error('Failed to fetch user names:', error);
    }
  }
  
  // 更新状态
  setUserNameMap(prevMap => ({ ...prevMap, ...newUserNameMap }));
};

/**
 * 获取工单日志
 */
export const fetchTicketLogs = async (
  ticketId: number,
  setLogs: (logs: TicketLog[]) => void,
  setUserNameMap: (map: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
) => {
  try {
    // 获取日志数据
    const logsResponse = await getTicketLogs(ticketId);
    
    let fetchedLogs = [];
    // 同样判断日志数据结构
    if (logsResponse.data && logsResponse.data.content) {
      fetchedLogs = logsResponse.data.content;
    } else if (Array.isArray(logsResponse.data)) {
      fetchedLogs = logsResponse.data;
    }
    
    // 处理日志中的处理人
    if (fetchedLogs.length > 0) {
      // 收集所有需要查询姓名的工号
      const handlerIds = new Set<string>();
      
      // 查找所有需要获取姓名的工号
      fetchedLogs.forEach(log => {
        // 日志中的处理人可能是数组，也可能是单个字符串
        if (log.handler) {
          if (Array.isArray(log.handler)) {
            log.handler.forEach((empid: string) => {
              if (empid && empid.trim() !== '' && !ticketStore.hasUserNameCached(empid)) {
                handlerIds.add(empid);
              }
            });
          } else if (typeof log.handler === 'string' && log.handler.trim() !== '' && !ticketStore.hasUserNameCached(log.handler)) {
            handlerIds.add(log.handler);
          }
        }
      });
      
      // 如果有需要获取姓名的工号，调用 API
      if (handlerIds.size > 0) {
        try {
          const empIdsArray = Array.from(handlerIds);
          const response = await searchUserNames(empIdsArray);
          
          if (response.data && response.data.content) {
            const apiUserNameMap = response.data.content;
            
            // 将 API 返回的用户名称缓存到 store
            Object.keys(apiUserNameMap).forEach(empid => {
              ticketStore.cacheUserName(empid, apiUserNameMap[empid]);
            });
            
            // 更新用户名称映射
            setUserNameMap(prevMap => ({
              ...prevMap,
              ...apiUserNameMap
            }));
          }
        } catch (error) {
          console.error('Failed to fetch log handler names:', error);
        }
      }
    }
    
    // 设置日志数据
    setLogs(fetchedLogs);
  } catch (logError) {
    console.error('Failed to fetch logs:', logError);
    // 日志获取失败不应该阻止整个页面渲染
  }
};

/**
 * 提交工单处理表单
 */
export const submitTicketForm = async (
  ticketId: number,
  values: TicketFormValues,
  username: string,
  setSubmitting: (submitting: boolean) => void,
  setTicket: (ticket: Ticket) => void,
  fetchTicketData: (ticketId: number) => Promise<void>,
  fetchTicketLogs: (ticketId: number) => Promise<void>,
  formRef: React.MutableRefObject<any>
) => {
  if (!ticketId) return;

  // 处理 labelInValue 模式下的handler数据
  const processedValues = { ...values };
  if (processedValues.handler && Array.isArray(processedValues.handler)) {
    processedValues.handler = processedValues.handler.map(item => {
      if (typeof item === 'object' && item.value) {
        return item.value;
      }
      return item;
    });
  }

  setSubmitting(true);
  try {
    const payload = {
      is_true: processedValues.is_true,
      is_need: processedValues.is_need,
      status: processedValues.status,
      responsible: processedValues.responsible,
      handler: processedValues.handler,
      log: {
        start_time: processedValues.start_time
          ? processedValues.start_time.format('YYYY-MM-DD HH:mm:ss')
          : undefined,
        end_time: processedValues.end_time
          ? processedValues.end_time.format('YYYY-MM-DD HH:mm:ss')
          : undefined,
        abnormal: processedValues.abnormal,
        solve_result: processedValues.solve_result,
        handler: processedValues.handler || username, // 如果没有填写处理人，默认使用当前登录用户的工号
      },
    };

    const response = await updateTicket(ticketId, payload);
    message.success('工单更新成功');
    
    // 获取更新后的工单数据
    if (response && response.data) {
      const updatedTicket = response.data.content || response.data;
      
      // 更新store中的工单数据
      if (updatedTicket) {
        ticketStore.updateTicket(updatedTicket);
        setTicket(updatedTicket);
      } else {
        // 如果无法从响应中获取更新后的数据，继续使用API获取最新数据
        fetchTicketData(ticketId);
      }
    } else {
      // 如果没有响应数据，重新获取
      fetchTicketData(ticketId);
    }
    
    // 无论如何，都需要刷新日志数据
    fetchTicketLogs(ticketId); 
    
    // 清空处理日志相关字段
    formRef.current.setFieldsValue({
      start_time: undefined,
      end_time: undefined,
      abnormal: '',
      solve_result: '',
      handler: [] // 返回空数组，在 labelInValue 模式下同样有效
    });
  } catch (error) {
    console.error('Failed to update ticket:', error);
    message.error('更新工单失败');
  } finally {
    setSubmitting(false);
  }
};

/**
 * 工号搜索处理函数
 */
export const handleWorkNoSearch = async (
  value: string,
  setHandlerOptions: (options: Array<{value: string, label: string}>) => void,
  setHandlerLoading: (loading: boolean) => void
) => {
  await handleWorkNoSearchBase(value, setHandlerOptions, setHandlerLoading);
};

/**
 * 检查工单是否已完成
 */
export const isTicketCompleted = (status: any): boolean => {
  if (status === 3 || status === '3') return true;
  if (status === 'completed') return true;
  return false;
};