import React from 'react';
import { Button, Space, Tag, Tooltip, Dropdown } from 'antd';
import { NotificationOutlined } from '@ant-design/icons';
import { Ticket } from '../../types';

// 生成表格列配置
export const useTicketColumns = (
  filter: { page: number; size: number },
  visibleColumns: string[],
  handleViewTicket: (id: number) => void,
  handleSendAlert: (id: number, type: string) => void
) => {
  // 列定义
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
  
  // 根据visibleColumns的顺序返回列配置
  return visibleColumns
    .map(key => columnDefs.find(col => col.key === key))
    .filter(column => column); // 移除undefined列
};

// 导出列表项配置
export const columnItems = [
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
];

// 默认可见列
export const initialVisibleColumns = [
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
