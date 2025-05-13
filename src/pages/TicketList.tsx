// src/pages/TicketList.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import {
  Table,
  Card,
  Form,
  Button,
  Row,
  Col,
  Pagination,
  message
} from 'antd';
import { searchData, sendSingleAlarm } from '../api';
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

  // 加载工号和用户姓名
  useEffect(() => {
    const workNo = getUserWorkNo();
    if (workNo) {
      setUsername(workNo);

      // 获取用户姓名
      const fetchUserName = async () => {
        try {
          const response = await searchData(workNo);
          if (response.data && response.data.code === 'S10000') {
            const userData = response.data.content; // 获取第一条记录
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

  // 只在filter状态改变时才获取工单，而非在表单值变化时
  useEffect(() => {
    fetchTickets(filter, setTickets, setTotal, setLoading);
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

  // 查看工单详情
  const handleViewTicket = (id: number) => {
    // 在工单列表中查找工单
    const ticket = tickets.find(t => t.id === id);
    if (ticket) {
      // 设置当前工单
      ticketStore.setCurrentTicket(ticket);
    }
    navigate(`/tickets/${id}`);
  };

  // 发送告警
  const handleSendAlert = async (id: number, type: string) => {
    // 在工单列表中查找工单
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) {
      message.error('找不到对应的工单信息');
      return;
    }

    try {
      if (type === '个人' && ticket.responsible && ticket.responsible.length > 0) {
        // 发送个人告警
        let serviceName, serviceType;
        if (ticketStore.hasServiceNameCached(ticket.service_token)) {
          serviceName = ticketStore.getCachedServiceName(ticket.service_token);
          serviceType = ticketStore.getCachedServiceType(ticket.service_token);
        }
        const requestData = {
          userids: ticket.responsible,
          service_name: serviceName || "-",
          service_type: serviceType || "-",
          token: ticket.service_token,
          same_alarm_inter: 5,
          type: 'link',
          link: {
            title: ticket.title,
            text: ticket.alarm_desc,
            url: 'http://test'
          }
        };

        await sendSingleAlarm(requestData);
        message.success(`已成功发送工单#${id}的${type}告警通知`);
      } else if (type === '群组') {
        // 群组通知逻辑，如果需要实现
        message.success(`已发送工单#${id}的${type}告警通知`);
      }
    } catch (error) {
      console.error('发送告警失败:', error);
      message.error(`发送${type}告警失败，请重试`);
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

  // 获取表格列配置
  const columns = useTicketColumns(filter, visibleColumns, handleViewTicket, handleSendAlert);

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
