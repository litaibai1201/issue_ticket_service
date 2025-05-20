/* eslint-disable @typescript-eslint/no-explicit-any */
import { message } from 'antd';
import { getServiceName, searchUserNames } from '../../api';
import { Ticket } from '../../types';
import ticketStore from '../../store/ticketStore';
import { handleWorkNoSearch as handleWorkNoSearchBase } from './WorkNoSearch';

/**
 * 获取服务名称
 * 该函数从API获取服务名称并使用回调函数更新状态
 */
export const fetchServiceName = async (
  serviceToken: string,
  setServiceName: (name: string) => void
) => {
  try {
    // 检查缓存
    if (ticketStore.hasServiceNameCached(serviceToken)) {
      const cachedName = ticketStore.getCachedServiceName(serviceToken);
      if (cachedName) {
        setServiceName(cachedName);
        return;
      }
    }

    const response = await getServiceName(serviceToken);
    if (response.data && response.data.content) {
      const serviceName = response.data.content.service_name;
      const serviceType = response.data.content.service_type;
      
      // 更新UI
      setServiceName(serviceName);
      
      // 缓存到store
      ticketStore.cacheServiceName(serviceToken, serviceName);
      ticketStore.cacheServiceType(serviceToken, serviceType);
    }
  } catch (error) {
    console.error(`Failed to fetch service name for token ${serviceToken}:`, error);
  }
};

/**
 * 获取单个服务名称并更新表格中特定行
 * 特定用于列表视图获取服务名称
 */
export const fetchSingleServiceName = async (
  serviceToken: string,
  index: number,
  updateTicketServiceName: (index: number, serviceName: string) => void
) => {
  // 检查缓存
  if (ticketStore.hasServiceNameCached(serviceToken)) {
    const cachedName = ticketStore.getCachedServiceName(serviceToken);
    if (cachedName) {
      updateTicketServiceName(index, cachedName);
      return;
    }
  }

  try {
    const response = await getServiceName(serviceToken);
    if (response.data && response.data.content) {
      const serviceName = response.data.content.service_name;
      const serviceType = response.data.content.service_type;

      // 更新UI
      updateTicketServiceName(index, serviceName);

      // 缓存到store
      ticketStore.cacheServiceName(serviceToken, serviceName);
      ticketStore.cacheServiceType(serviceToken, serviceType);
    }
  } catch (error) {
    console.error(`Failed to fetch service name for token ${serviceToken}:`, error);
  }
};

/**
 * 通用的获取用户名称逻辑
 * 用于从API获取用户名称并缓存结果
 */
export const fetchUserNamesFromApi = async (
  empIds: string[],
  updateCallback?: (userMap: Record<string, string>) => void
): Promise<Record<string, string>> => {
  const newUserNameMap: Record<string, string> = {};
  
  if (empIds.length === 0) {
    return newUserNameMap;
  }
  
  try {
    const response = await searchUserNames(empIds);
    if (response.data && response.data.content) {
      const apiUserNameMap = response.data.content;

      // 将API返回的用户名称缓存到store
      Object.keys(apiUserNameMap).forEach(empid => {
        ticketStore.cacheUserName(empid, apiUserNameMap[empid]);
        newUserNameMap[empid] = apiUserNameMap[empid];
      });
      
      // 如果提供了回调函数，使用获取的用户名称调用它
      if (updateCallback) {
        updateCallback(newUserNameMap);
      }
    }
  } catch (error) {
    console.error('Failed to fetch user names:', error);
    message.error('获取用户名称失败');
  }
  
  return newUserNameMap;
};

/**
 * 收集需要查询名称的工号
 * 返回两个集合：需要查询的工号和已缓存的用户名映射
 */
export const collectEmpIdsForNameQuery = (empIds: string[]): {
  idsToQuery: string[],
  cachedNames: Record<string, string>
} => {
  const idsToQuery: string[] = [];
  const cachedNames: Record<string, string> = {};
  
  if (!empIds || !Array.isArray(empIds)) {
    return { idsToQuery, cachedNames };
  }
  
  empIds.forEach(empid => {
    if (empid && empid.trim() !== '') {
      const cachedName = ticketStore.getCachedUserName(empid);
      if (cachedName) {
        cachedNames[empid] = cachedName;
      } else {
        idsToQuery.push(empid);
      }
    }
  });
  
  return { idsToQuery, cachedNames };
};

/**
 * 从单个Ticket对象收集所有需要查询名称的员工ID
 */
export const collectEmpIdsFromTicket = (ticket: Ticket): {
  allEmpIds: Set<string>,
  cachedUserMap: Record<string, string>
} => {
  const allEmpIds = new Set<string>();
  const cachedUserMap: Record<string, string> = {};

  // 处理责任人列表
  if (ticket.responsible && Array.isArray(ticket.responsible)) {
    ticket.responsible.forEach(empid => {
      if (empid && empid.trim() !== '') {
        const cachedName = ticketStore.getCachedUserName(empid);
        if (cachedName) {
          cachedUserMap[empid] = cachedName;
        } else {
          allEmpIds.add(empid);
        }
      }
    });
  }

  // 处理处理人列表
  if (ticket.handler && Array.isArray(ticket.handler)) {
    ticket.handler.forEach(empid => {
      if (empid && empid.trim() !== '') {
        const cachedName = ticketStore.getCachedUserName(empid);
        if (cachedName) {
          cachedUserMap[empid] = cachedName;
        } else {
          allEmpIds.add(empid);
        }
      }
    });
  }

  return { allEmpIds, cachedUserMap };
};

/**
 * 工号搜索处理函数
 * 通用的工号搜索功能，用于查找用户
 */
export const handleWorkNoSearch = async (
  value: string,
  setOptions: (options: Array<{value: string, label: string, name?: string, disabled?: boolean}>) => void,
  setLoading: (loading: boolean) => void
) => {
  await handleWorkNoSearchBase(value, setOptions, setLoading);
};

/**
 * 检查异常单是否已完成
 */
export const isTicketCompleted = (status: any): boolean => {
  if (status === 3 || status === '3') return true;
  if (status === 'completed') return true;
  return false;
};

/**
 * 处理异常单级别的显示格式
 */
export const levelMap = (level: number) => {
  if (level === 1) {
    return '<font color=white>提示</font>';
  } else if (level === 2) {
    return '<font color=orange>警告</font>';
  } else if (level === 3) {
    return '<font color=red>重要</font>';
  } else if (level === 4) {
    return '<font color=purple>紧急</font>';
  } else {
    return '<font color=yellow>未知级别</font>';
  }
};

/**
 * 处理异常单状态的显示格式
 */
export const statusMap = (status: number) => {
  if (status === 1) {
    return '<font color=red>待处理</font>';
  } else if (status === 2) {
    return '<font color=orange>处理中</font>';
  } else if (status === 3) {
    return '<font color=green>已完成</font>';
  } else {
    return '<font color=yellow>未知级别</font>';
  }
};
