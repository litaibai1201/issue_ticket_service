import { message } from 'antd';
import { getTicketById, getTicketLogs, updateTicket } from '../../api';
import { Ticket, TicketLog } from '../../types';
import ticketStore from '../../store/ticketStore';
import { TicketFormValues } from './TicketForm';
import {
  fetchServiceName as fetchServiceNameUtil,
  fetchUserNamesFromApi,
  collectEmpIdsFromTicket,
  handleWorkNoSearch as handleWorkNoSearchUtil,
  isTicketCompleted as checkTicketCompleted
} from './TicketServiceUtils';

// 重新导出 fetchServiceName 供外部使用
export const fetchServiceName = fetchServiceNameUtil;

/**
 * 加载异常单数据
 */
export const fetchTicketData = async (
  ticketId: string,
  setTicket: (ticket: Ticket) => void,
  setLoading: (loading: boolean) => void,
  setServiceName: (name: string) => void,
  setUserNameMap: (map: Record<string, string>) => void,
  fetchUserNames: (ticket: Ticket) => Promise<void>,
  fetchTicketLogs: (ticketId: string) => Promise<void>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formRef: React.MutableRefObject<any>
) => {
  setLoading(true);
  try {
    // 获取异常单信息
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
      throw new Error('无法解析异常单数据');
    }

    setTicket(ticketData);

    // 如果有service_token，获取服务名称
    if (ticketData.service_token) {
      await fetchServiceName(ticketData.service_token, setServiceName);
    }

    // 将异常单数据保存到store
    ticketStore.setCurrentTicket(ticketData);

    // 设置表单基础初始值，不包括处理人和状态
    if (formRef.current) {
      formRef.current.setFieldsValue({
        is_true: ticketData.is_true === "1" ? 1 : 0,
        is_need: ticketData.is_need === "1" ? 1 : 0,
        responsible: ticketData.responsible
      });
    } else {
      console.warn('Form ref is not available when setting initial values');
    }

    // 加载用户名称
    await fetchUserNames(ticketData);

    // 获取异常单日志
    await fetchTicketLogs(ticketId);
  } catch (error) {
    console.error('Failed to fetch ticket data:', error);
    message.error('获取异常单数据失败');
  } finally {
    setLoading(false);
  }
};

/**
 * 获取用户名称
 */
export const fetchUserNames = async (
  ticket: Ticket,
  setUserNameMap: (map: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
) => {
  // 使用共享工具函数收集工号和缓存数据
  const { allEmpIds, cachedUserMap } = collectEmpIdsFromTicket(ticket);

  // 更新已缓存的用户名称
  if (Object.keys(cachedUserMap).length > 0) {
    setUserNameMap(prevMap => ({ ...prevMap, ...cachedUserMap }));
  }

  // 如果还有未缓存的用户名称，则调用API获取
  if (allEmpIds.size > 0) {
    const empIdsArray = Array.from(allEmpIds);
    const newUserMap = await fetchUserNamesFromApi(empIdsArray);
    
    // 更新状态
    if (Object.keys(newUserMap).length > 0) {
      setUserNameMap(prevMap => ({ ...prevMap, ...newUserMap }));
    }
  }
};

/**
 * 获取异常单日志
 */
export const fetchTicketLogs = async (
  ticketId: string,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchedLogs.forEach((log: { handler: any }) => {
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

      // 如果有需要获取姓名的工号，调用API
      if (handlerIds.size > 0) {
        const empIdsArray = Array.from(handlerIds);
        const userNameMap = await fetchUserNamesFromApi(empIdsArray);
        
        // 更新用户名称映射
        if (Object.keys(userNameMap).length > 0) {
          setUserNameMap(prevMap => ({
            ...prevMap,
            ...userNameMap
          }));
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
 * 提交异常单处理表单
 * @returns Promise<boolean> 提交是否成功
 */
export const submitTicketForm = async (
  ticketId: string,
  values: TicketFormValues,
  username: string,
  setSubmitting: (submitting: boolean) => void,
  setTicket: (ticket: Ticket) => void,
  fetchTicketData: (ticketId: string) => Promise<void>,
  fetchTicketLogs: (ticketId: string) => Promise<void>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formRef: React.MutableRefObject<any>
): Promise<boolean> => {
  if (!ticketId) return false;

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
    // 创建请求参数
    const payload = {
      is_true: processedValues.is_true === "1" || processedValues.is_true === 1 ? 1 : 0,
      is_need: processedValues.is_need === "1" || processedValues.is_need === 1 ? 1 : 0,
      status: processedValues.status,
      handle_data: {
        start_time: processedValues.start_time
          ? processedValues.start_time.format('YYYY-MM-DD HH:mm:ss')
          : undefined,
        end_time: processedValues.end_time
          ? processedValues.end_time.format('YYYY-MM-DD HH:mm:ss')
          : undefined,
        abnormal: processedValues.abnormal,
        // 如果"是否需要处理"为否，则将处理结果设置为"无需处理"
        solve_result: processedValues.is_need === "0" || processedValues.is_need === 0
          ? '无需处理'
          : processedValues.solve_result,
        handler: processedValues.handler || username, // 如果没有填写处理人，默认使用当前登录用户的工号
      },
    };

    // 打印请求数据，方便调试
    console.log('API Payload:', JSON.stringify(payload, null, 2));

    const response = await updateTicket(ticketId, payload);
    
    // 检查提交状态
    if (!response || !response.data) {
      message.error('更新异常单失败: 无效的响应');
      return false;
    }
    
    message.success('异常单更新成功');

    // 获取更新后的异常单数据
    const updatedTicket = response.data.content || response.data;

    // 更新store中的异常单数据
    if (updatedTicket) {
      ticketStore.updateTicket(updatedTicket);
      setTicket(updatedTicket);
    } else {
      // 如果无法从响应中获取更新后的数据，继续使用API获取最新数据
      fetchTicketData(ticketId);
    }

    // 无论如何，都需要刷新日志数据
    fetchTicketLogs(ticketId);

    // 清空处理日志相关字段
    if (formRef.current) {
      formRef.current.setFieldsValue({
        start_time: undefined,
        end_time: undefined,
        abnormal: '',
        solve_result: '',
        handler: [] // 返回空数组，在 labelInValue 模式下同样有效
      });
    } else {
      console.warn('Form ref is not available when clearing form values');
    }
    
    return true; // 提交成功
  } catch (error) {
    console.error('Failed to update ticket:', error);
    message.error('更新异常单失败');
    return false; // 提交失败
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
  await handleWorkNoSearchUtil(value, setHandlerOptions, setHandlerLoading);
};

/**
 * 检查异常单是否已完成
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isTicketCompleted = (status: any): boolean => {
  return checkTicketCompleted(status);
};
