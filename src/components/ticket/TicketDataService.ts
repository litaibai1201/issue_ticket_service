import { message } from 'antd';
import { getTickets, getServiceName, searchUserNames } from '../../api';
import { Ticket, TicketFilter } from '../../types';
import ticketStore from '../../store/ticketStore';

// 定义扩展后的工单接口，包含显示用字段
export interface TicketWithDisplayInfo extends Ticket {
  service_name_display?: string;
  responsible_display?: {
    empid: string;
    name: string;
    display: string;
    tooltip: string;
  }[];
  handler_display?: {
    empid: string;
    name: string;
    display: string;
    tooltip: string;
  }[];
}

/**
 * 获取工单列表数据
 */
export const fetchTickets = async (
  filter: TicketFilter,
  setTickets: (tickets: TicketWithDisplayInfo[]) => void,
  setTotal: (total: number) => void,
  setLoading: (loading: boolean) => void
) => {
  setLoading(true);
  try {
    // 创建一个只包含有效值的过滤参数对象
    const filterParams: TicketFilter = {
      page: 0,
      size: 0
    };

    // 只添加非空值
    if (filter.page) filterParams.page = filter.page;
    if (filter.size) filterParams.size = filter.size;

    // 处理字符串类型的筛选字段，确保它们有值
    if (filter.keyword && filter.keyword.trim() !== '') filterParams.keyword = filter.keyword.trim();
    if (filter.factory && filter.factory.trim() !== '') filterParams.factory = filter.factory.trim();
    if (filter.location && filter.location.trim() !== '') filterParams.location = filter.location.trim();
    if (filter.bu && filter.bu.trim() !== '') filterParams.bu = filter.bu.trim();
    if (filter.station && filter.station.trim() !== '') filterParams.station = filter.station.trim();
    // 使用 work_no 字段作为调用 /issues 接口的参数 - 与 searchData 接口返回的 workno 保持一致
    if (filter.work_no && filter.work_no.trim() !== '') filterParams.work_no = filter.work_no.trim();

    // 状态可能是数字或字符串
    if (filter.status !== undefined && filter.status !== null && filter.status.toString().trim() !== '') {
      filterParams.status = filter.status;
    }

    console.log('原始过滤条件:', filter);
    console.log('API调用的过滤参数:', filterParams);

    const response = await getTickets(filterParams);
    if (response.data && response.data.code === 'S10000') {
      const ticketData = response.data.content.datalist;
      console.log('Ticket data received:', ticketData);

      // 添加服务名称显示字段和责任人显示字段
      const enhancedTickets = ticketData.map((ticket: Ticket) => ({
        ...ticket,
        service_name_display: ticket.service_name || '-',
        responsible_display: [],
        handler_display: []
      }));

      setTickets(enhancedTickets);
      setTotal(response.data.content.total_count);

      // 保存工单列表到store
      ticketStore.setTickets(ticketData);

      console.log('Calling fetchServiceNames and fetchUserNames...');
      // 异步加载服务名称
      fetchServiceNames(enhancedTickets, setTickets);

      // 异步加载责任人名称
      fetchUserNames(enhancedTickets, setTickets);
    } else {
      message.error('获取工单列表失败');
    }
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    message.error('获取工单列表失败');
  } finally {
    setLoading(false);
  }
};

/**
 * 获取服务名称
 */
export const fetchServiceNames = async (
  ticketList: TicketWithDisplayInfo[],
  setTickets: (tickets: TicketWithDisplayInfo[]) => void
) => {
  // 逐个处理服务令牌，如果存在service_token则获取服务名称
  for (let i = 0; i < ticketList.length; i++) {
    const ticket = ticketList[i];
    if (ticket.service_token) {
      await fetchSingleServiceName(ticket.service_token, i, setTickets);
    }
  }
};

/**
 * 获取单个服务名称
 */
export const fetchSingleServiceName = async (
  serviceToken: string,
  index: number,
  setTickets: (tickets: TicketWithDisplayInfo[]) => void
) => {
  // 检查缓存
  if (ticketStore.hasServiceNameCached(serviceToken)) {
    const cachedName = ticketStore.getCachedServiceName(serviceToken);
    if (cachedName) {
      updateTicketServiceName(index, cachedName, setTickets);
      return;
    }
  }

  try {
    const response = await getServiceName(serviceToken);
    if (response.data && response.data.content) {
      const serviceName = response.data.content.service_name;
      const serviceType = response.data.content.service_type;

      // 更新UI
      updateTicketServiceName(index, serviceName, setTickets);

      // 缓存到store
      ticketStore.cacheServiceName(serviceToken, serviceName);
      ticketStore.cacheServiceType(serviceToken, serviceType);
    }
  } catch (error) {
    console.error(`Failed to fetch service name for token ${serviceToken}:`, error);
  }
};

/**
 * 更新表格中的服务名称
 */
export const updateTicketServiceName = (
  index: number,
  serviceName: string,
  setTickets: (tickets: TicketWithDisplayInfo[]) => void
) => {
  setTickets((prevTickets: any) => {
    const newTickets = [...prevTickets];
    if (newTickets[index]) {
      newTickets[index] = {
        ...newTickets[index],
        service_name_display: serviceName
      };
    }
    return newTickets;
  });
};

/**
 * 获取用户名称
 */
export const fetchUserNames = async (
  ticketList: TicketWithDisplayInfo[],
  setTickets: (tickets: TicketWithDisplayInfo[]) => void
) => {
  console.log('fetchUserNames called with tickets:', ticketList);
  // 收集所有需要查询的员工ID
  const allEmpIds = new Set<string>();

  ticketList.forEach((ticket, index) => {
    const mergedUniqueArray = ticket.responsible && ticket.handler ?
      [...ticket.responsible, ...ticket.handler] :
      (ticket.responsible || ticket.handler || []);

    if (Array.isArray(mergedUniqueArray)) {
      mergedUniqueArray.forEach((empid: string) => {
        if (empid && !allEmpIds.has(empid) && !ticketStore.hasUserNameCached(empid)) {
          console.log(`Adding empid ${empid} to allEmpIds`);
          allEmpIds.add(empid);
        }
      });
    }
  });

  console.log('Collected employee IDs:', Array.from(allEmpIds));

  // 如果没有需要查询的ID，则直接返回
  if (allEmpIds.size === 0) {
    console.log('No employee IDs to fetch, updating from cache');
    // 仍然需要从缓存中更新显示内容
    updateDisplayFromCache(ticketList, setTickets);
    return;
  }

  try {
    // 去重后的员工ID数组
    const empIdsArray = Array.from(allEmpIds);
    console.log('Fetching user names for empids:', empIdsArray);

    const response = await searchUserNames(empIdsArray);
    if (response.data && response.data.content) {
      const userNameMap = response.data.content;
      console.log('Received user names:', userNameMap);

      // 缓存结果
      for (const empid of empIdsArray) {
        if (userNameMap[empid]) {
          ticketStore.cacheUserName(empid, userNameMap[empid]);
        }
      }

      // 逐个处理工单，更新责任人名称
      ticketList.forEach((ticket, index) => {
        updateTicketUserName(index, userNameMap, setTickets);
      });
    }
  } catch (error) {
    console.error('Failed to fetch user names:', error);
  }
};

/**
 * 从缓存中更新显示内容
 */
export const updateDisplayFromCache = (
  ticketList: TicketWithDisplayInfo[],
  setTickets: (tickets: TicketWithDisplayInfo[]) => void
) => {
  ticketList.forEach((ticket, index) => {
    const userMap: Record<string, string> = {};

    // 只需要传入空的userMap，函数内部会优先从缓存中获取
    updateTicketUserName(index, userMap, setTickets);
  });
};

/**
 * 更新表格中的责任人名称
 */
export const updateTicketUserName = (
  index: number,
  userMap: Record<string, string>,
  setTickets: (tickets: TicketWithDisplayInfo[]) => void
) => {
  setTickets((prevTickets: any) => {
    const newTickets = [...prevTickets];
    if (newTickets[index]) {
      const ticket = {...newTickets[index]};

      // 责任人列表格式化
      if (ticket.responsible && Array.isArray(ticket.responsible)) {
        const responsibleUsers = [];
        for (const empid of ticket.responsible) {
          if (empid && empid.trim() !== '') {
            const name = ticketStore.getCachedUserName(empid) || userMap[empid];
            if (name) {
              responsibleUsers.push({
                empid,
                name,
                display: `${name}`,
                tooltip: `工号: ${empid}\n姓名: ${name}`
              });
            }
          }
        }
        ticket.responsible_display = responsibleUsers;
      }

      // 处理人列表格式化
      if (ticket.handler && Array.isArray(ticket.handler)) {
        const handlerUsers = [];
        for (const empid of ticket.handler) {
          if (empid && empid.trim() !== '') {
            const name = ticketStore.getCachedUserName(empid) || userMap[empid];
            if (name) {
              handlerUsers.push({
                empid,
                name,
                display: `${name}`,
                tooltip: `工号: ${empid}\n姓名: ${name}`
              });
            }
          }
        }
        ticket.handler_display = handlerUsers;
      }

      newTickets[index] = ticket;
    }
    return newTickets;
  });
};
