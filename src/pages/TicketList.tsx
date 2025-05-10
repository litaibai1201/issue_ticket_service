// src/pages/TicketList.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import _, { forEach, debounce } from 'lodash';
import {
  Table,
  Card,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Space,
  Checkbox,
  Pagination,
  Popover,
  Tooltip,
  Avatar,
  Dropdown,
  message,
  Tag
} from 'antd';
import { SettingOutlined, ReloadOutlined, UserOutlined, LogoutOutlined, DownOutlined, MenuOutlined, NotificationOutlined } from '@ant-design/icons';
import { getTickets, getServiceName, searchUserNames, searchData, getUserInfoByWorkNo } from '../api';
import { Ticket, TicketFilter } from '../types/index';
import { getUserWorkNo } from '../utils/token';
import ticketStore from '../store/ticketStore';

const { Option } = Select;
const { Search } = Input;

const TicketList: React.FC = () => {
  const [username, setUsername] = useState<string>(''); // 存储工号
  const [userDisplayName, setUserDisplayName] = useState<string>(''); // 存储用户姓名
  const [workNoOptions, setWorkNoOptions] = useState<Array<{value: string, label: string, disabled: boolean}>>([]);
  const [workNoLoading, setWorkNoLoading] = useState<boolean>(false);
  
  // 扩展Ticket接口以包含服务名称显示字段和责任人显示字段
  interface TicketWithDisplayInfo extends Ticket {
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
  
  const [tickets, setTickets] = useState<TicketWithDisplayInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [filter, setFilter] = useState<TicketFilter>({
    page: 1,
    size: 10,
  });
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [columnsModalVisible, setColumnsModalVisible] = useState<boolean>(false);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const draggableItemsRef = useRef<HTMLDivElement[]>([]);
  
  // 所有可能的列键名
  const allColumnKeys = [
    'id',
    'title',
    'alarm_desc',
    'service_name',
    'location',
    'factory',
    'bu',
    'station',
    'responsible',
    'handler',
    'level',
    'type_nm',
    'webhook',
    'is_true',
    'is_need',
    'status',
    'created_at',
    'updated_at',
    'actions',
  ];
  
  // 页面初始列设置，用于重置功能
  const initialVisibleColumns = [
    'id',
    'title',
    'service_name',
    'location',
    'factory',
    'bu',
    'station',
    'responsible',
    'handler',
    'level',
    'is_true',
    'is_need',
    'status',
    'created_at',
    'actions',
  ];
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(initialVisibleColumns);

  const factories = [
    { id: '1', name: '一厂' },
    { id: '2', name: '二厂' },
    { id: '3', name: '三厂' },
  ];

  const locations = [
    { id: '1', name: '鹏鼎园区' },
    { id: '2', name: '礼鼎园区' },
  ];

  const businessUnits = [
    { id: '1', name: 'BU1' },
    { id: '2', name: 'BU2' },
    { id: '3', name: 'BU3' },
  ];

  const statuses = [
    { id: '1', name: '待处理' },
    { id: '2', name: '处理中' },
    { id: '3', name: '已完成' },
  ];

  // 加载工号和用户姓名
  useEffect(() => {
    const workNo = getUserWorkNo();
    if (workNo) {
      setUsername(workNo);
      
      // 获取用户姓名
      const fetchUserName = async () => {
        try {
          const response = await getUserInfoByWorkNo(workNo);
          if (response.data && response.data.code === 'S10000' && Array.isArray(response.data.content) && response.data.content.length > 0) {
            const userData = response.data.content[0]; // 获取第一条记录
            if (userData.chnname) {
              setUserDisplayName(userData.chnname);
            }
          }
        } catch (error) {
          console.error('Failed to fetch user name:', error);
        }
      };
      
      fetchUserName();
    } else {
      // 如果没有token或解析失败，重定向到登录页
      navigate('/login');
    }
  }, [navigate]);

  // 加载保存的提列表项列表顺序
  useEffect(() => {
    const savedColumns = localStorage.getItem('ticketListVisibleColumns');
    if (savedColumns) {
      try {
        const parsedColumns = JSON.parse(savedColumns);
        setVisibleColumns(parsedColumns);
      } catch (e) {
        console.error('Failed to parse saved columns:', e);
      }
    }
  }, []);

  // 只在filter状态改变时才获取工单，而非在表单值变化时
  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
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
        fetchServiceNames(enhancedTickets);
        
        // 异步加载责任人名称
        fetchUserNames(enhancedTickets);
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

  // 异步获取服务名称
  const fetchServiceNames = async (ticketList: TicketWithDisplayInfo[]) => {
    // 逐个处理服务令牌，如果存在service_token则获取服务名称
    for (let i = 0; i < ticketList.length; i++) {
      const ticket = ticketList[i];
      if (ticket.service_token) {
        await fetchSingleServiceName(ticket.service_token, i);
      }
    }
  };

  // 获取单个服务名称
  const fetchSingleServiceName = async (serviceToken: string, index: number) => {
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
        const serviceName = response.data.content;
        
        // 更新UI
        updateTicketServiceName(index, serviceName);
        
        // 缓存到store
        ticketStore.cacheServiceName(serviceToken, serviceName);
      }
    } catch (error) {
      console.error(`Failed to fetch service name for token ${serviceToken}:`, error);
    }
  };

  // 更新表格中的服务名称
  const updateTicketServiceName = (index: number, serviceName: string) => {
    setTickets(prevTickets => {
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

  // 更新表格中的责任人名称
  const updateTicketUserName = (index: number, userMap: Record<string, string>) => {
  setTickets(prevTickets => {
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
  
  // 获取用户名称
  const fetchUserNames = async (ticketList: TicketWithDisplayInfo[]) => {
    console.log('fetchUserNames called with tickets:', ticketList);
    // 收集所有需要查询的员工ID
    const allEmpIds = new Set<string>();
    
    ticketList.forEach((ticket, index) => {
      console.log(`Checking ticket ${index}:`, {
        responsible: ticket.responsible,
        handler: ticket.handler
      });
      const mergedUniqueArray = _.union(ticket.responsible, ticket.handler);
      mergedUniqueArray.forEach((empid: string, index: number) => {
        if (empid && !allEmpIds.has(empid) && !ticketStore.hasUserNameCached(empid)) {
          console.log(`Adding responsible ${empid}} to allEmpIds`);
          allEmpIds.add(empid);
        }
      });
    });
    
    console.log('Collected employee IDs:', Array.from(allEmpIds));
    
    // 如果没有需要查询的ID，则直接返回
    if (allEmpIds.size === 0) {
      console.log('No employee IDs to fetch, updating from cache');
      // 仍然需要从缓存中更新显示内容
      updateDisplayFromCache(ticketList);
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
          updateTicketUserName(index, userNameMap);
        });
      }
    } catch (error) {
      console.error('Failed to fetch user names:', error);
    }
  };
  
  // 从缓存中更新显示内容
  const updateDisplayFromCache = (ticketList: TicketWithDisplayInfo[]) => {
    ticketList.forEach((ticket, index) => {
      const userMap: Record<string, string> = {};
      
      // 只需要传入空的userMap，函数内部会优先从缓存中获取
      updateTicketUserName(index, userMap);
    });
  };

  const handleSearch = (keyword: string) => {
    console.log('调用handleSearch搜索关键字:', keyword);
    
    // 获取当前表单中全部字段的值，包括筛选栏的值
    const formValues = form.getFieldsValue();
    
    // 合并关键字到表单值
    const newFormValues = { ...formValues, keyword, page: 1 };
    
    // 提交到过滤器，触发API调用
    handleFilter(newFormValues);
  };

  const handleFilter = (values: any) => {
    // 处理 labelInValue 模式下的工号值
    const processedValues = { ...values };
    if (processedValues.work_no && typeof processedValues.work_no === 'object' && processedValues.work_no.value) {
      processedValues.work_no = processedValues.work_no.value;
    }
    
    // 过滤空值，只保留有值的字段
    const filteredValues: any = {};
    Object.keys(processedValues).forEach(key => {
      // 如果值存在且不为空，则保留
      if (processedValues[key] !== undefined && processedValues[key] !== null && processedValues[key] !== '') {
        filteredValues[key] = processedValues[key];
      }
    });
    
    console.log('Form values after filtering:', filteredValues);
    
    // 更新过滤条件，并重置页码
    setFilter((prev) => {
      // 创建一个只包含基本属性的新对象
      const baseFilter: TicketFilter = {
        page: 1, // 重置页码
        size: prev.size // 保持原有的每页数量
      };
      
      // 将过滤后的值合并到新对象
      const newFilter = { ...baseFilter, ...filteredValues };
      console.log('New filter state:', newFilter);
      return newFilter;
    });
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    setFilter((prev) => ({
      ...prev,
      page,
      size: pageSize || prev.size,
    }));
  };

  const handlePageSizeChange = (current: number, size: number) => {
    setFilter((prev) => ({ ...prev, page: 1, size: size }));
  };

  const handleViewTicket = (id: number) => {
    // 在工单列表中查找工单
    const ticket = tickets.find(t => t.id === id);
    if (ticket) {
      // 设置当前工单
      ticketStore.setCurrentTicket(ticket);
    }
    navigate(`/tickets/${id}`);
  };

  const handleSendAlert = (id: number, type: string) => {
    message.success(`已发送工单#${id}的${type}告警通知`);
  };

  const toggleColumnVisibility = (column: string) => {
    if (visibleColumns.includes(column)) {
      const newColumns = visibleColumns.filter((col) => col !== column);
      setVisibleColumns(newColumns);
      localStorage.setItem('ticketListVisibleColumns', JSON.stringify(newColumns));
    } else {
      const newColumns = [...visibleColumns, column];
      setVisibleColumns(newColumns);
      localStorage.setItem('ticketListVisibleColumns', JSON.stringify(newColumns));
    }
  };
  
  // 表单值变化时只更新表单状态，不触发API调用
  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    // 输出当前表单的值，用于调试
    console.log('Form values changed:', allValues);
    console.log('Changed values:', changedValues);
    
    // 如果有任何字段被清空，需要从过滤器中移除该字段
    const removedFields: string[] = [];
    Object.keys(changedValues).forEach(key => {
      // 检查值是否为空（包括 undefined, null, 空字符串）
      if (changedValues[key] === undefined || changedValues[key] === null || changedValues[key] === '') {
        removedFields.push(key);
      }
    });
    
    // 如果有字段被清空，需要从过滤器中移除
    if (removedFields.length > 0) {
      setFilter(prevFilter => {
        const newFilter = { ...prevFilter };
        // 删除所有被清空的字段
        removedFields.forEach(field => {
          delete newFilter[field as keyof TicketFilter];
        });
        return newFilter;
      });
    }
    
    // 如果工号变化了，自动触发搜索
    if ('work_no' in changedValues) {
      // 如果选择了工号，将该值从对象转换为工号字符串
      if (changedValues.work_no && typeof changedValues.work_no === 'object' && changedValues.work_no.value) {
        // 创建一个新的表单值对象，将 work_no 转换为字符串
        const newValues = { ...allValues };
        newValues.work_no = changedValues.work_no.value;
        
        // 自动提交当前表单
        setTimeout(() => {
          handleFilter(newValues);
        }, 0);
      } else if (changedValues.work_no === undefined || changedValues.work_no === null || changedValues.work_no === '') {
        // 如果工号被清空，不需要额外处理，上面的removedFields逻辑已经处理了
      } else {
        // 如果是普通的值变化（非清空），正常处理
        setTimeout(() => {
          handleFilter(allValues);
        }, 0);
      }
    }
  };
  
  // 列定义静态化，避免重新创建
  // 列定义静态化，避免重新创建
  const allColumnItems = useMemo(() => [
      { key: 'id', label: '序号' },
      { key: 'title', label: '告警名称' },
      { key: 'alarm_desc', label: '告警内容' },
      { key: 'service_name', label: '服务名称' },
      { key: 'location', label: '园区' },
      { key: 'factory', label: '厂区' },
      { key: 'bu', label: '业务单位' },
      { key: 'station', label: '工站' },
      { key: 'responsible', label: '责任人' },
      { key: 'handler', label: '处理人' },
      { key: 'level', label: '告警级别' },
      { key: 'type_nm', label: '告警类别' },
      { key: 'webhook', label: '通知对象' },
      { key: 'is_true', label: '是否真实异常' },
      { key: 'is_need', label: '是否需要处理' },
      { key: 'status', label: '工单状态' },
      { key: 'created_at', label: '创建时间' },
      { key: 'updated_at', label: '更新时间' },
      { key: 'actions', label: '操作' },
  ], []);
  
  // 使用useMemo缓存列表内容，避免频繁重新计算
  const memoizedColumnItems = useMemo(() => {
    // 使用Set快速检查列是否可见
    const visibleSet = new Set(visibleColumns);
    
    // 创建映射表以快速查找排序索引
    const indexMap: Record<string, number> = {};
    visibleColumns.forEach((col, index) => {
      indexMap[col] = index;
    });
    
    // 分类并排序列项
    const visibleItems: { index: any; key: string; label: string; }[] = [];
    const hiddenItems: { key: string; label: string; }[] = [];
    
    allColumnItems.forEach(item => {
      if (visibleSet.has(item.key)) {
        visibleItems.push({
          ...item,
          index: indexMap[item.key]
        });
      } else {
        hiddenItems.push(item);
      }
    });
    
    // 使用稳定排序算法按列索引排序
    visibleItems.sort((a, b) => a.index - b.index);
    
    // 返回排序后的列表，先可见项目，后不可见项目
    return [...visibleItems, ...hiddenItems];
  }, [visibleColumns, allColumnItems]);

  // 使用useRef保存可见列，避免频繁的状态更新
  const visibleColumnsRef = useRef<string[]>(visibleColumns);
  
  // 记录当前列表项DOM元素的位置信息，实现平滑过渡
  const listPositionRef = useRef<Map<string, DOMRect>>(new Map());
  
  // 虚拟列表优化相关状态
  const [visibleItemsRange, setVisibleItemsRange] = useState({ start: 0, end: 50 });
  const listContainerRef = useRef<HTMLDivElement>(null);
  
  // 记录列表项初始位置，用于计算动画
  const captureItemPositions = () => {
    const newPositions = new Map<string, DOMRect>();
    document.querySelectorAll('.drag-item').forEach((item) => {
      const key = item.getAttribute('data-key');
      if (key) {
        newPositions.set(key, item.getBoundingClientRect());
      }
    });
    return newPositions;
  };
  
  // 防抖处理函数，提高性能
  const debouncedUpdateVisibleColumns = useCallback(
    debounce((newColumns: string[]) => {
      setVisibleColumns(newColumns);
    }, 20),
    []
  );
  
  // 快速计算可见区域，仅渲染可见元素
  const handleScroll = useCallback(_.throttle(() => {
    if (listContainerRef.current) {
      const container = listContainerRef.current;
      const containerTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      // 假设每个项目的高度为40px
      const itemHeight = 40;
      const buffer = 8; // 增加缓冲区域，上下各多渲染8个项，减少滚动时的空白
      
      const startIndex = Math.max(0, Math.floor(containerTop / itemHeight) - buffer);
      const endIndex = Math.min(
        memoizedColumnItems.length - 1, 
        Math.ceil((containerTop + containerHeight) / itemHeight) + buffer
      );
      
      // 仅当范围发生变化时才更新状态，减少重新渲染
      if (startIndex !== visibleItemsRange.start || endIndex !== visibleItemsRange.end) {
        setVisibleItemsRange({ start: startIndex, end: endIndex });
      }
    }
  }, 50), [memoizedColumnItems.length, visibleItemsRange]);
  
  // 滚动时更新可见范围
  useEffect(() => {
    const listContainer = listContainerRef.current;
    if (listContainer) {
      listContainer.addEventListener('scroll', handleScroll);
      // 初始计算可见区域
      handleScroll();
      
      return () => {
        listContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);
  
  // 实现虚拟列表的数据
  const visibleItems = useMemo(() => {
    // 在拖拽过程中不使用虚拟列表，确保所有元素都被渲染
    if (draggingItem || dragOverItem) {
      return memoizedColumnItems;
    }
    
    // 仅渲染可见区域
    return memoizedColumnItems.slice(visibleItemsRange.start, visibleItemsRange.end + 1);
  }, [memoizedColumnItems, visibleItemsRange, draggingItem, dragOverItem]);
  
  // 提供列表高度占位元素
  const listHeight = memoizedColumnItems.length * 40; // 假设每个项目高度为40px
  
  // 视觉效果优化
  const applyPositionTransition = useCallback(() => {
    const oldPositions = listPositionRef.current;
    const newPositions = captureItemPositions();
    
    // 应用过渡效果
    document.querySelectorAll('.drag-item').forEach((item) => {
      const key = item.getAttribute('data-key');
      if (key && oldPositions.has(key)) {
        const oldPos = oldPositions.get(key)!;
        const newPos = newPositions.get(key);
        
        if (newPos) {
          // 计算位移
          const deltaX = oldPos.left - newPos.left;
          const deltaY = oldPos.top - newPos.top;
          
          if (Math.abs(deltaY) > 5) { // 只对有显著位置变化的元素应用动画
            // 应用反向位移，准备动画
            const htmlItem = item as HTMLElement;
            htmlItem.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            htmlItem.style.transition = 'none';
            
            // 强制重绘以应用初始位置
            void htmlItem.offsetWidth;
            
            // 添加过渡效果并重置位置
            htmlItem.style.transition = 'transform 300ms ease-out';
            requestAnimationFrame(() => {
              htmlItem.style.transform = '';
            });
          }
        }
      }
    });
  }, []);
  
  // 同步ref和state
  useEffect(() => {
    visibleColumnsRef.current = visibleColumns;
    // 在列表更新后捕获新的元素位置
    requestAnimationFrame(() => {
      listPositionRef.current = captureItemPositions();
    });
  }, [visibleColumns]);
  
  // 拖拽开始时的处理（优化版）
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, key: string) => {
    // 使用dataTransfer保存更多信息
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'move';
    
    // 设置拖拽元素样式
    const target = e.currentTarget;
    requestAnimationFrame(() => {
      target.style.opacity = '0.4';
      target.style.transform = 'scale(1.03)';
    });
    
    // 设置拖拽状态，但避免重新渲染
    setDraggingItem(key);
  }, []);

  // 拖拽过程中的处理（优化版）
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 性能优化：使用节流避免频繁状态更新
    if (dragOverItem !== key) {
      setDragOverItem(key);
    }
  }, [dragOverItem]);
  
  // 通过DOM操作预览拖拽位置，避免频繁渲染
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, key: string) => {
    e.preventDefault();
    if (key !== draggingItem) {
      // 目标元素添加视觉提示
      e.currentTarget.style.backgroundColor = '#f0f0f0';
      e.currentTarget.style.borderTop = '2px solid #1890ff';
    }
  }, [draggingItem]);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // 恢复原始样式
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.borderTop = '1px solid transparent';
  }, []);

  // 拖拽结束时的处理（优化版）
  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // 处理元素样式恢复
    const target = e.currentTarget;
    target.style.opacity = '1';
    target.style.transform = 'scale(1)';
    
    // 如果有有效的拖拽和放置
    if (draggingItem && dragOverItem && draggingItem !== dragOverItem) {
      // 在更新之前捕获当前元素位置，用于日后的视觉过渡
      listPositionRef.current = captureItemPositions();
      
      // 计算拖拽项和目标项的位置
      const dragItemIndex = visibleColumnsRef.current.indexOf(draggingItem);
      const dropItemIndex = visibleColumnsRef.current.indexOf(dragOverItem);
      
      if (dragItemIndex !== -1 && dropItemIndex !== -1) {
        // 创建新数组，但不触发重新渲染
        const newVisibleColumns = [...visibleColumnsRef.current];
        newVisibleColumns.splice(dragItemIndex, 1);
        
        // 计算实际插入位置
        let insertIndex = dropItemIndex;
        if (dragItemIndex < dropItemIndex) {
          insertIndex = dropItemIndex - 1;
        }
        newVisibleColumns.splice(insertIndex, 0, draggingItem);
        
        // 先更新ref，避免闭包陷阱
        visibleColumnsRef.current = newVisibleColumns;
        
        // 先保存到localStorage
        localStorage.setItem('ticketListVisibleColumns', JSON.stringify(newVisibleColumns));
        
        // 使用防抖函数更新UI状态
        debouncedUpdateVisibleColumns(newVisibleColumns);
        
        // 在下一帧应用动画效果
        requestAnimationFrame(() => {
          setTimeout(applyPositionTransition, 10);
        });
      }
    }
    
    // 重置拖拽状态
    setDraggingItem(null);
    setDragOverItem(null);
    
    // 恢复所有列表项的样式
    const dragItems = document.querySelectorAll('.drag-item');
    dragItems.forEach((item) => {
      (item as HTMLElement).style.backgroundColor = 'transparent';
      (item as HTMLElement).style.borderTop = '1px solid transparent';
    });
  }, [draggingItem, dragOverItem, debouncedUpdateVisibleColumns, applyPositionTransition, captureItemPositions]);

  // 根据visibleColumns对列进行排序
  const getOrderedColumns = () => {
    // 创建一个映射存储所有列的定义
    const columnDefs = [
      {
        key: 'id',
        title: '序号',
        dataIndex: 'id',
        width: 80,
        render: (id: number, record: Ticket, index: number) => {
          // 计算当前页的序号，从 1 开始
          const pageIndex = (filter.page - 1) * filter.size + index + 1;
          return (
            <Tooltip title={`工单ID: ${id}`}>
              <span>{pageIndex}</span>
            </Tooltip>
          );
        },
      },
      {
        key: 'title',
        title: '告警名称',
        dataIndex: 'title',
        render: (title: string, record: Ticket) => (
          <Tooltip title={<div>
            <p><strong>告警名称:</strong> {title}</p>
            <p><strong>告警内容:</strong> {record.alarm_desc || '-'}</p>
            <p><strong>告警类别:</strong> {record.type_nm || '-'}</p>
            <p><strong>通知对象:</strong> {record.webhook || '-'}</p>
          </div>} placement="right">
            <a onClick={() => handleViewTicket(record.id)} style={{ cursor: 'pointer' }}>{title}</a>
          </Tooltip>
        ),
      },
      {
        key: 'alarm_desc',
        title: '告警内容',
        dataIndex: 'alarm_desc',
        ellipsis: true,
      },
      {
        key: 'service_name',
        title: '服务名称',
        dataIndex: 'service_name_display',
      },
      {
        key: 'location',
        title: '园区',
        dataIndex: 'location',
      },
      {
        key: 'factory',
        title: '厂区',
        dataIndex: 'factory',
      },
      {
        key: 'bu',
        title: '业务单位',
        dataIndex: 'bu',
      },
      {
        key: 'station',
        title: '工站',
        dataIndex: 'station',
      },
      {
        key: 'responsible',
        title: '责任人',
        dataIndex: 'responsible_display',
        render: (users: any[]) => {
          if (!users || users.length === 0) return '-';
          return (
            <div>
              {users.map((user, idx) => (
                <Tooltip key={idx} title={<pre>{user.tooltip}</pre>}>
                  <Tag color="blue" style={{ margin: '2px', cursor: 'pointer' }}>
                    {user.display}
                  </Tag>
                </Tooltip>
              ))}
            </div>
          );
        },
      },
      {
        key: 'handler',
        title: '处理人',
        dataIndex: 'handler_display',
        render: (users: any[]) => {
          if (!users || users.length === 0) return '-';
          return (
            <div>
              {users.map((user, idx) => (
                <Tooltip key={idx} title={<pre>{user.tooltip}</pre>}>
                  <Tag color="green" style={{ margin: '2px', cursor: 'pointer' }}>
                    {user.display}
                  </Tag>
                </Tooltip>
              ))}
            </div>
          );
        },
      },
      {
        key: 'level',
        title: '告警级别',
        dataIndex: 'level',
        render: (level: number) => {
          const levelMap: Record<number, { color: string; text: string }> = {
            1: { color: 'blue', text: '提示' },
            2: { color: 'orange', text: '警告' },
            3: { color: 'red', text: '重要' },
            4: { color: 'purple', text: '紧急' },
          };
          const { color, text } = levelMap[level] || {
            color: 'default',
            text: '未知级别',
          };
          return <span style={{ color }}>{text}</span>;
        },
      },
      {
        key: 'type_nm',
        title: '告警类别',
        dataIndex: 'type_nm',
      },
      {
        key: 'webhook',
        title: '通知对象',
        dataIndex: 'webhook',
      },
      {
        key: 'is_true',
        title: '是否真实异常',
        dataIndex: 'is_true',
        render: (isTrue: boolean | null) => {
          if (isTrue === null) return '未确认';
          return isTrue ? '是' : '否';
        },
      },
      {
        key: 'is_need',
        title: '是否需要处理',
        dataIndex: 'is_need',
        render: (isNeed: boolean | null) => {
          if (isNeed === null) return '未确认';
          return isNeed ? '是' : '否';
        },
      },
      {
        key: 'status',
        title: '工单状态',
        dataIndex: 'status',
        render: (status: number) => {
          const statusMap: Record<number, { color: string; text: string }> = {
            1: { color: 'orange', text: '待处理' },
            2: { color: 'blue', text: '处理中' },
            3: { color: 'green', text: '已完成' },
          };
          const { color, text } = statusMap[status] || {
            color: 'default',
            text: '未知状态',
          };
          return <span style={{ color }}>{text}</span>;
        },
      },
      {
        key: 'created_at',
        title: '创建时间',
        dataIndex: 'created_at',
      },
      {
        key: 'updated_at',
        title: '更新时间',
        dataIndex: 'updated_at',
        render: (time: string | null) => time || '-',
      },
      {
        key: 'actions',
        title: '操作',
        render: (_: any, record: Ticket) => (
          <Space>
            {record.status !== 3 && (
              <>
                <Button
                  type="link"
                  onClick={() => handleViewTicket(record.id)}
                >
                  填写
                </Button>
                <Dropdown 
                  menu={{
                    items: [
                      {
                        key: 'group',
                        label: '群组',
                        onClick: () => handleSendAlert(record.id, '群组')
                      },
                      {
                        key: 'personal',
                        label: '个人',
                        onClick: () => handleSendAlert(record.id, '个人')
                      }
                    ]
                  }}
                  placement="bottomRight"
                  arrow
                >
                  <Tooltip title="发送告警">
                    <Button 
                      type="text" 
                      icon={<NotificationOutlined style={{ color: '#1890ff' }} />} 
                    />
                  </Tooltip>
                </Dropdown>
              </>
            )}
          </Space>
        ),
      },
    ];
    
    // 按visibleColumns的顺序返回列配置
    return visibleColumns
      .map(key => columnDefs.find(col => col.key === key))
      .filter(column => column); // 移除undefined列
  };

  const columns = getOrderedColumns();

  const handleLogout = () => {
    // 清除token
    localStorage.removeItem('token');
    message.success('退出成功');
    navigate('/login');
  };

  useEffect(() => {
    // 当过滤条件变化时，打印当前的过滤条件（调试用）
    console.log('Current filter:', filter);
  }, [filter]);
  
  // 工号搜索函数
  const handleWorkNoSearch = useCallback(
    debounce(async (value: string) => {
      if (!value || value.trim() === '') {
        setWorkNoOptions([]);
        return;
      }

      // 检查是否含有中文字符
      const hasChinese = /[\u4e00-\u9fa5]/.test(value);
      
      // 如果含有中文，且至少有一个中文字符，则允许搜索
      // 如果不含中文（数字或英文字符），长度必须超过5个才能搜索
      if ((hasChinese && value.trim().length >= 1) || (!hasChinese && value.trim().length > 5)) {
        setWorkNoLoading(true);
        try {
          const response = await searchData(value);
          if (response.data && response.data.code === 'S10000' && Array.isArray(response.data.content)) {
            const data = response.data.content;
            // 按工号排序
            data.sort((a: { workno: string; }, b: { workno: any; }) => a.workno.localeCompare(b.workno));
            // 格式化选项，下拉选项显示部门信息，选择后只显示姓名
            const options = data.map((item: { dep3name: any; dep4name: any; dep5name: any; dep6name: any; chnname: any; workno: any; }) => {
              // 创建显示标签，仅包含非空值
              const nameParts = [];
              if (item.dep3name) nameParts.push(item.dep3name);
              if (item.dep4name) nameParts.push(item.dep4name);
              if (item.dep5name) nameParts.push(item.dep5name);
              if (item.dep6name) nameParts.push(item.dep6name);
              if (item.chnname) nameParts.push(item.chnname);
              
              const label = nameParts.join('-');
              
              return {
                value: item.workno,
                label: label,
                // 增加自定义属性存储姓名，用于选择后显示
                name: item.chnname || ''
              };
            });
            setWorkNoOptions(options);
          } else {
            setWorkNoOptions([]);
          }
        } catch (error) {
          console.error('Failed to fetch work_no data:', error);
          message.error('获取工号数据失败');
          setWorkNoOptions([]);
        } finally {
          setWorkNoLoading(false);
        }
      } else {
        // 如果不满足搜索条件，清空选项或设置提示
        if (!hasChinese) {
          setWorkNoOptions([{
            value: '',
            label: '请输入至少6个字符',
            disabled: true
          }]);
        } else {
          setWorkNoOptions([{
            value: '',
            label: '请至少输入一个中文字符',
            disabled: true
          }]);
        }
      }
    }, 300),
    []
  );

  return (
    <div>
      <div className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
        <Link to="/tickets" className="text-2xl font-bold cursor-pointer hover:text-blue-200 text-white no-underline">工单管理平台</Link>
        <div className="flex items-center">
          <Dropdown menu={{items: [
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              label: '退出登录',
              onClick: handleLogout
            }
          ]}} placement="bottomRight" trigger={['hover']}>
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <span className="mr-2">{userDisplayName || username}</span>
              <Avatar icon={<UserOutlined />} />
            </div>
          </Dropdown>
        </div>
      </div>

      <div className="p-6">

      <Card className="mb-6">
        <Form
          form={form}
          layout="horizontal"
          onFinish={(values) => handleFilter(values)} // 点击提交按钮时才触发handleFilter
          initialValues={{ location: '', factory: '', bu: '', status: '', work_no: '', station: '', keyword: '' }}
          onValuesChange={handleFormValuesChange}
        >
          <Row gutter={16}>
          <Col xs={24} sm={12} md={4}>
          <Form.Item name="location" label="园区">
          <Select placeholder="选择园区" allowClear>
          {locations.map((loc) => (
          <Option key={loc.id} value={loc.id}>
          {loc.name}
          </Option>
          ))}
          </Select>
          </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
          <Form.Item name="factory" label="厂区">
          <Select placeholder="选择厂区" allowClear>
          {factories.map((factory) => (
          <Option key={factory.id} value={factory.id}>
          {factory.name}
          </Option>
          ))}
          </Select>
          </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
          <Form.Item name="bu" label="业务单位">
          <Select placeholder="选择业务单位" allowClear>
          {businessUnits.map((bu) => (
          <Option key={bu.id} value={bu.id}>
          {bu.name}
          </Option>
          ))}
          </Select>
          </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
          <Form.Item name="station" label="工站">
          <Select placeholder="选择工站" allowClear>
          <Option value="station1">工站 1</Option>
          <Option value="station2">工站 2</Option>
          <Option value="station3">工站 3</Option>
          </Select>
          </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
          <Form.Item name="status" label="工单状态">
          <Select placeholder="选择状态" allowClear>
          {statuses.map((status) => (
          <Option key={status.id} value={status.id}>
          {status.name}
          </Option>
          ))}
          </Select>
          </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={4}>
          <Form.Item name="work_no" label="工号">
            <Select
              showSearch
              placeholder="输入工号"
              defaultActiveFirstOption={false}
              // showArrow={false}
              filterOption={false}
              onSearch={handleWorkNoSearch}
              notFoundContent={workNoLoading ? <span>加载中...</span> : null}
              options={workNoOptions}
              loading={workNoLoading}
              allowClear
              labelInValue
              optionLabelProp="name"
            />
          </Form.Item>
          </Col>
          </Row>
          <Row>
          <Col span={24} style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <Form.Item name="keyword" style={{ marginBottom: 0, width: '300px' }}>
          <Search
          placeholder="输入关键字搜索"
          allowClear
          enterButton="搜索"
          onSearch={handleSearch}
          />
          </Form.Item>
          </Col>
          </Row>
        </Form>
      </Card>

      <Card className="mb-6">
        <div className="flex justify-between mb-4">
          <Popover
            content={
              <div style={{ width: '180px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold' }}>显示列设置</span>
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<ReloadOutlined />} 
                    onClick={() => {
                      setVisibleColumns(initialVisibleColumns);
                      localStorage.removeItem('ticketListVisibleColumns');
                    }}
                  >
                    重置
                  </Button>
                </div>
                <div 
                  ref={listContainerRef}
                  style={{ maxHeight: '300px', overflow: 'auto', contain: 'paint layout style' }} 
                  className="column-list-container"
                >
                  <div style={{ height: `${listHeight}px`, position: 'relative', width: '100%' }}>
                    {visibleItems.map((item) => {
                      // 计算每个项目的位置
                      const itemIndex = memoizedColumnItems.indexOf(item);
                      const offsetTop = itemIndex * 40;
                      
                      return (
                        <div 
                          key={item.key}
                          className="drag-item"
                          data-key={item.key}
                          style={{ 
                            position: 'absolute',
                            top: `${offsetTop}px`,
                            left: 0,
                            right: 0,
                            height: '40px',
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '4px 8px',
                            cursor: visibleColumns.includes(item.key) ? 'move' : 'default',
                            boxShadow: dragOverItem === item.key ? '0 0 5px rgba(24, 144, 255, 0.5)' : 'none',
                            transition: 'transform 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease, box-shadow 0.2s ease',
                            userSelect: 'none', // 防止文本选择影响拖拽
                            willChange: 'transform, opacity', // 告知浏览器这些属性将会变化
                            zIndex: draggingItem === item.key ? 10 : 1, // 拖拽项提升层级
                            backgroundColor: '#ffffff', // 设置背景色强调层次感
                            margin: 0,
                          }}
                          draggable={visibleColumns.includes(item.key)}
                          onDragStart={(e) => handleDragStart(e, item.key)}
                          onDragOver={(e) => handleDragOver(e, item.key)}
                          onDragEnter={(e) => handleDragEnter(e, item.key)}
                          onDragLeave={handleDragLeave}
                          onDragEnd={handleDragEnd}
                        >
                          <Checkbox
                            checked={visibleColumns.includes(item.key)}
                            onChange={() => toggleColumnVisibility(item.key)}
                          >
                            {item.label}
                          </Checkbox>
                          {visibleColumns.includes(item.key) && (
                            <MenuOutlined style={{ color: '#999', cursor: 'grab' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            }
            trigger="click"
            placement="bottomRight"
            open={columnsModalVisible}
            onOpenChange={(visible) => setColumnsModalVisible(visible)}
          >
            <Button icon={<SettingOutlined />}>
              显示列设置
            </Button>
          </Popover>
        </div>

        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          pagination={false}
        />

        <div className="mt-4 flex justify-end">
          <Pagination
            current={filter.page}
            pageSize={filter.size}
            total={total}
            showSizeChanger
            showQuickJumper
            showTotal={(total) => `共 ${total} 条记录`}
            onChange={handlePageChange}
            onShowSizeChange={handlePageSizeChange}
          />
        </div>
      </Card>
      </div>
    </div>
  );
};

export default TicketList;