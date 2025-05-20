/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/TicketList.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleOutlined, SettingOutlined } from '@ant-design/icons';
import {
  Table,
  Card,
  Form,
  Pagination,
  message,
  notification,
  Dropdown,
  Menu
} from 'antd';
import { searchUserData, sendGroupAlarmMsg, sendSingleAlarm, getFilterData, getServiceWhiteName } from '../api';
import { levelMap, statusMap } from '../components/ticket/TicketServiceUtils';
import { TicketFilter } from '../types/index';
import { getUserWorkNo } from '../utils/token';
import ticketStore from '../store/ticketStore';
import {
  WorkNoOption,
  createDebouncedWorkNoSearch
} from '../components/ticket/WorkNoSearch';

// 导入拆分出的组件
import HeaderBar from '../components/layout/HeaderBar';
import TicketFilterForm from '../components/ticket/TicketFilterForm';
import ColumnSettings from '../components/ticket/ColumnSettings';
import {
  columnItems,
  initialVisibleColumns,
  useTicketColumns
} from '../components/ticket/TicketTableColumns';
import {
  TicketWithDisplayInfo,
  fetchTickets
} from '../components/ticket/TicketDataService';

const TicketList: React.FC = () => {
  const [username, setUsername] = useState<string>(''); // 存储工号
  const [userDisplayName, setUserDisplayName] = useState<string>(''); // 存储用户姓名
  const [workNoOptions, setWorkNoOptions] = useState<WorkNoOption[]>([]);
  const [workNoLoading, setWorkNoLoading] = useState<boolean>(false);

  // 动态筛选数据
  const [locationOptions, setLocationOptions] = useState<{id: string; name: string}[]>([]);
  const [factoryOptions, setFactoryOptions] = useState<{id: string; name: string}[]>([]);
  const [buOptions, setBuOptions] = useState<{id: string; name: string}[]>([]);
  const [stationOptions, setStationOptions] = useState<{id: string; name: string}[]>([]);
  const [serviceTokens, setServiceTokens] = useState<string[]>([]);
  const [whiteNameMap, setWhiteNameMap] = useState<Record<string, string[]>>({});
  const [filterDataLoading, setFilterDataLoading] = useState<boolean>(false);
  const [whiteNameLoading, setWhiteNameLoading] = useState<boolean>(false);

  const [tickets, setTickets] = useState<TicketWithDisplayInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [filter, setFilter] = useState<TicketFilter>({
    page: 1,
    size: 10,
  });
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // 列设置相关状态
  const [visibleColumns, setVisibleColumns] = useState<string[]>(initialVisibleColumns);

  // 加载保存的列表项列表顺序
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

  // 加载工号和用户姓名以及筛选数据
  useEffect(() => {
    const workNo = getUserWorkNo();
    if (workNo) {
      setUsername(workNo);
      // 获取用户姓名
      const fetchUserName = async () => {
        try {
          // 从缓存中获取用户名称，如果有的话
          const cachedUserName = ticketStore.getCachedUserName(workNo);
          if (cachedUserName) {
            setUserDisplayName(cachedUserName);
          } else {
            const response = await searchUserData(workNo);
            if (response.data && response.data.code === 'S10000') {
              const userData = response.data.content; // 获取第一条记录
              if (userData.chnname) {
                setUserDisplayName(userData.chnname);
                // 缓存用户名称
                ticketStore.cacheUserName(workNo, userData.chnname);
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch user name:', error);
        }
      };

      fetchUserName();
      
      // 获取筛选数据
      fetchFilterData();
    } else {
      // 如果没有token或解析失败，重定向到登录页
      navigate('/login');
    }
  }, [navigate]);
  
  // 获取筛选数据
  const fetchFilterData = async () => {
    try {
      setFilterDataLoading(true);
      const response = await getFilterData();
      if (response.data && response.data.code === 'S10000') {
        const { bu, factory, location, station } = response.data.content;
        
        // 将字符串数组转换为选项格式
        setLocationOptions(location.map(item => ({ id: item, name: item })));
        setFactoryOptions(factory.map(item => ({ id: item, name: item })));
        setBuOptions(bu.map(item => ({ id: item, name: item })));
        setStationOptions(station.map(item => ({ id: item, name: item })));
      }
    } catch (error) {
      console.error('Failed to fetch filter data:', error);
      notification.error({
        message: '获取筛选数据失败',
        description: '请刷新页面重试',
        placement: 'topRight',
        duration: 3
      });
    } finally {
      setFilterDataLoading(false);
    }
  };
  
  // 从异常单列表中获取全部 service_token 并去重
  const getUniqueServiceTokens = (ticketList: TicketWithDisplayInfo[]): string[] => {
    const tokenSet = new Set<string>();
    
    ticketList.forEach(ticket => {
      if (ticket.service_token) {
        tokenSet.add(ticket.service_token);
      }
    });
    
    return Array.from(tokenSet);
  };
  
  // 获取服务白名单
  const fetchServiceWhiteNames = async (ticketList: TicketWithDisplayInfo[]) => {
    // 得到异常单中的唯一service_token列表
    const uniqueTokens = getUniqueServiceTokens(ticketList);
    
    if (uniqueTokens.length === 0) {
      return;
    }
    
    console.log(`Fetching white names for ${uniqueTokens.length} unique service tokens`);
    setWhiteNameLoading(true);
    const newWhiteNameMap: Record<string, string[]> = {};
    
    try {
      // 对每个 service_token 调用接口
      for (const token of uniqueTokens) {
        try {
          const response = await getServiceWhiteName(token);
          if (response.data && response.data.code === 'S10000') {
            // 假设返回的数据在 content 字段中，并且是标题数组
            if (response.data.content && Array.isArray(response.data.content)) {
              newWhiteNameMap[token] = response.data.content;
            } else if (response.data.content && Array.isArray(response.data.content.titles)) {
              newWhiteNameMap[token] = response.data.content.titles;
            }
          }
        } catch (err) {
          console.error(`Failed to fetch white name for token ${token}:`, err);
          // 单个 token 请求失败不影响整体流程，继续请求下一个
        }
      }
      
      // 更新白名单映射
      setWhiteNameMap(newWhiteNameMap);
      console.log('White name data fetched:', newWhiteNameMap);
    } catch (error) {
      console.error('Failed to fetch service white names:', error);
    } finally {
      setWhiteNameLoading(false);
    }
  };

  // 只在filter状态改变时才获取异常单，而非在表单值变化时
  useEffect(() => {
    fetchTickets(filter, setTickets, setTotal, setLoading, fetchServiceWhiteNames);
  }, [filter]);

  // 处理搜索功能
  const handleSearch = (keyword: string) => {
    console.log('调用handleSearch搜索关键字:', keyword);

    // 获取当前表单中全部字段的值，包括筛选栏的值
    const formValues = form.getFieldsValue();

    // 合并关键字到表单值
    const newFormValues = { ...formValues, keyword, page: 1 };

    // 提交到过滤器，触发API调用
    handleFilter(newFormValues);
  };

  // 处理筛选条件
  const handleFilter = (values: any) => {
    // 处理 labelInValue 模式下的工号值
    const processedValues = { ...values };
    if (processedValues.work_no && typeof processedValues.work_no === 'object') {
      if (processedValues.work_no.value) {
        // 正确的 labelInValue 格式
        processedValues.work_no = processedValues.work_no.value;
      } else if (typeof processedValues.work_no === 'string') {
        // 已经是字符串，保持原样
      } else {
        // 不正确的对象格式，可能是空对象
        delete processedValues.work_no;
      }
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

  // 处理翻页
  const handlePageChange = (page: number, pageSize?: number) => {
    setFilter((prev) => ({
      ...prev,
      page,
      size: pageSize || prev.size,
    }));
  };

  // 处理页码大小变化
  const handlePageSizeChange = (current: number, size: number) => {
    setFilter((prev) => ({ ...prev, page: 1, size: size }));
  };

  // 这里已经使用从工具库导入的 levelMap 和 statusMap 函数

  // 查看异常单详情
  const handleViewTicket = (id: number) => {
    // 在异常单列表中查找异常单
    const ticket = tickets.find(t => t.id === id);
    if (ticket) {
      // 设置当前异常单
      ticketStore.setCurrentTicket(ticket);
    }
    navigate(`/tickets/${id}`);
  };

  // 发送告警
  const handleSendAlert = async (id: number, type: string) => {
    // 在异常单列表中查找异常单
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) {
      notification.error({
        message: '发送失败',
        description: '找不到对应的异常单信息',
        placement: 'topRight',
        duration: 3
      });
      return;
    }

    try {
      // 发送个人告警
      let serviceName, serviceType, response;
      if (ticketStore.hasServiceNameCached(ticket.service_token)) {
        serviceName = ticketStore.getCachedServiceName(ticket.service_token);
        serviceType = ticketStore.getCachedServiceType(ticket.service_token);
      }
      const text = '<font color=#F75000>**' + serviceName + '**</font>\n\n告警地址: ' + ticket.location + '--' + ticket.factory + '--' + ticket.bu + '\n\n告警名稱: ' + ticket.title + '\n\n告警內容: [' + ticket.alarm_desc + '](' + 'http://test' + ')\n\n告警類別: ' + ticket.type_nm + '\n\n告警級別: ' + levelMap(ticket.level) + '\n\n告警次數: ' + ticket.alarm_num + '\n\n告警狀態: ' + statusMap(ticket.status) + '\n\n初告警時間: ' + ticket.created_at + '\n\n異常單地址: [http://test](' + 'http://test' + ')'

      if (type === '个人' && ticket.responsible && ticket.responsible.length > 0) {
        // 创建FormData对象而不是JSON对象
        const formData = new FormData();
        if (ticket.responsible && ticket.responsible.length > 0){
          ticket.responsible.forEach((empid: string) => {
            formData.append('userids', empid);
          })
        }
        formData.append('service_name', serviceName || "-");
        formData.append('service_type', serviceType || "-");
        formData.append('token', ticket.service_token);
        formData.append('same_alarm_inter', '1');
        formData.append('type', 'markdown');
        const markdownData = {
          title: ticket.title,
          text: text
        }
        // 对于嵌套对象，可以使用JSON字符串或分别添加属性
        formData.append('markdown', JSON.stringify(markdownData));
        response = await sendSingleAlarm(formData);
      } else if (type === '群组' && ticket.webhook && ticket.responsible && ticket.responsible.length > 0) {
        const requestData = {
          service_name: serviceName || "-",
          service_type: serviceType || "-",
          token: ticket.service_token,
          same_alarm_inter: 5,
          webhook: ticket.webhook,
          type: 'markdown',
          markdown: {
            title: ticket.title,
            text: text + '\n\n',
            atuserids: {
              at: ticket.responsible
            }
          }
        };
        response = await sendGroupAlarmMsg(requestData);
      } else {
        response = { 'data': null };
      }
      // 检查响应结果
      if (response.data && response.data.code === 'S10000') {
        // 告警发送成功，使用notification弹出右上角提示
        console.log(notification)
        notification.success({
          message: '发送成功',
          description: `已成功发送异常单#${id}的告警通知`,
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          placement: 'topRight',
          duration: 3,
        });
      } else {
        // 告警发送失败
        notification.error({
          message: '发送失败',
          description: `发送告警失败: ${response.data?.msg || '未知错误'}`,
          placement: 'topRight',
          duration: 3
        });
      }
    } catch (error) {
      console.error('发送告警失败:', error);
      notification.error({
        message: '发送失败',
        description: `发送告警失败，请重试`,
        placement: 'topRight',
        duration: 3
      });
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
      // 检查工号的值
      const workNoValue = changedValues.work_no;

      if (workNoValue) {
        // 如果工号有值
        if (typeof workNoValue === 'object') {
          if (workNoValue.value) {
            // 符合 labelInValue 格式
            const newValues = { ...allValues };
            newValues.work_no = workNoValue;

            // 自动提交当前表单
            setTimeout(() => {
              handleFilter(newValues);
            }, 0);
          } else {
            console.warn('work_no object without value property:', workNoValue);
          }
        } else if (typeof workNoValue === 'string') {
          // 如果是字符串，我们需要将它转换为对象格式
          const newValues = { ...allValues };
          newValues.work_no = { value: workNoValue, label: workNoValue };

          // 更新表单字段的值
          form.setFieldsValue({ work_no: newValues.work_no });

          // 自动提交当前表单
          setTimeout(() => {
            handleFilter(newValues);
          }, 0);
        }
      } else if (workNoValue === undefined || workNoValue === null || workNoValue === '') {
        // 如果工号被清空，不需要额外处理，上面的removedFields逻辑已经处理了
      }
    }
  };

  // 工号搜索函数
  const handleWorkNoSearch = useCallback(
    createDebouncedWorkNoSearch(setWorkNoOptions, setWorkNoLoading),
    []
  );

  // 退出登录
  const handleLogout = () => {
    // 清除token
    localStorage.removeItem('token');
    message.success('退出成功');
    navigate('/login');
  };

  // 判断异常单是否在白名单中
  const isTicketInWhitelist = (ticket: TicketWithDisplayInfo): boolean => {
    if (!ticket || !ticket.service_token || !ticket.title) return false;
    
    // 获取该服务的白名单
    const whiteNameList = whiteNameMap[ticket.service_token];
    if (!whiteNameList || !Array.isArray(whiteNameList)) return false;
    
    // 检查异常单标题是否在白名单中
    return whiteNameList.includes(ticket.title);
  };
  
  // 处理添加或移出白名单
  const handleWhitelistOperation = (id: number, operation: 'add' | 'remove') => {
    // 找到异常单
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) {
      notification.error({
        message: '操作失败',
        description: '找不到对应的异常单信息',
        placement: 'topRight',
        duration: 3
      });
      return;
    }
    
    if (operation === 'add') {
      message.success(`已将异常单 #${id} 添加到白名单`); 
      // 这里应该调用添加白名单的 API
      // 在 API 调用成功后需要更新 whiteNameMap 状态
      console.log(`添加白名单: ${ticket.title}, token: ${ticket.service_token}`);
    } else {
      message.success(`已将异常单 #${id} 从白名单中移除`);
      // 这里应该调用移除白名单的 API
      // 在 API 调用成功后需要更新 whiteNameMap 状态
      console.log(`移除白名单: ${ticket.title}, token: ${ticket.service_token}`);
    }
    
    // 模拟更新白名单状态（真实实现中应该根据 API 响应更新）
    if (ticket.service_token && ticket.title) {
      const newWhiteNameMap = { ...whiteNameMap };
      if (!newWhiteNameMap[ticket.service_token]) {
        newWhiteNameMap[ticket.service_token] = [];
      }
      
      if (operation === 'add') {
        // 添加到白名单
        if (!newWhiteNameMap[ticket.service_token].includes(ticket.title)) {
          newWhiteNameMap[ticket.service_token] = [
            ...newWhiteNameMap[ticket.service_token],
            ticket.title
          ];
        }
      } else {
        // 从白名单中移除
        newWhiteNameMap[ticket.service_token] = newWhiteNameMap[ticket.service_token].filter(
          title => title !== ticket.title
        );
      }
      
      setWhiteNameMap(newWhiteNameMap);
    }
  };

  // 处理添加白名单
  const handleAddWhitelist = () => {
    // 检查是否有服务白名单数据
    if (Object.keys(whiteNameMap).length === 0) {
      message.info('正在加载服务白名单数据...');
      // 如果没有数据，尝试重新加载
      if (tickets.length > 0) {
        fetchServiceWhiteNames(tickets);
      }
      return;
    }
    
    // 显示白名单数据渲染数量
    const totalWhiteNames = Object.values(whiteNameMap).reduce(
      (sum, titles) => sum + titles.length, 0
    );
    
    message.success(`发现 ${Object.keys(whiteNameMap).length} 个服务令牌，共 ${totalWhiteNames} 个白名单项目`);
    
    // 这里可以打开一个模态框，显示白名单详情并允许用户添加
    // 但目前无需改动界面，我们仅在控制台输出白名单数据
    console.log('Service white name data:', whiteNameMap);
  };

  // 获取异常单的菜单项
  const getTicketMenuItems = (ticketId: number) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return [];
    
    // 检查异常单是否在白名单中
    const inWhitelist = isTicketInWhitelist(ticket);
    
    return [
      {
        key: inWhitelist ? 'removeWhitelist' : 'addWhitelist',
        label: inWhitelist ? '移除白名单' : '添加白名单',
        onClick: () => handleWhitelistOperation(ticketId, inWhitelist ? 'remove' : 'add')
      }
    ];
  };
  
  // 获取表格列配置
  const columns = useTicketColumns(filter, visibleColumns, handleViewTicket, handleSendAlert, getTicketMenuItems);

  return (
    <div>
      <HeaderBar
        username={username}
        userDisplayName={userDisplayName}
        onLogout={handleLogout}
      />

      <div className="p-6">
        <Card className="mb-6">
          <TicketFilterForm
            form={form}
            onFilter={handleFilter}
            onSearch={handleSearch}
            onFormValuesChange={handleFormValuesChange}
            handleWorkNoSearch={handleWorkNoSearch}
            workNoOptions={workNoOptions}
            workNoLoading={workNoLoading}
            locationOptions={locationOptions}
            factoryOptions={factoryOptions}
            buOptions={buOptions}
            stationOptions={stationOptions}
          />
        </Card>

        <Card className="mb-6">
          <div className="flex justify-between mb-4">
            <ColumnSettings
              allColumnItems={columnItems}
              visibleColumns={visibleColumns}
              setVisibleColumns={setVisibleColumns}
            />
          </div>

          <Table
            columns={columns}
            dataSource={tickets}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 'max-content' }}
            size="small"
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
