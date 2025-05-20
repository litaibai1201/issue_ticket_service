/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Button, Space, Tag, Tooltip, Dropdown } from 'antd';
import { NotificationOutlined, SettingOutlined } from '@ant-design/icons';
import { Ticket } from '../../types';

// 生成表格列配置
export const useTicketColumns = (
  filter: { page: number; size: number },
  visibleColumns: string[],
  handleViewTicket: (id: number) => void,
  handleSendAlert: (id: number, type: string) => void,
  settingsMenuItems?: any[]
) => {
  // 列定义
  const columnDefs = [
    {
      key: 'id',
      title: '序号',
      dataIndex: 'id',
      width: 70,
      fixed: 'left', // 固定在左侧
      render: (id: number, record: Ticket, index: number) => {
        // 计算当前页的序号，从 1 开始
        const pageIndex = (filter.page - 1) * filter.size + index + 1;
        return (
          <Tooltip title={`异常单ID: ${id}`}>
            <span>{pageIndex}</span>
          </Tooltip>
        );
      },
    },
    {
      key: 'title',
      title: '告警名称',
      dataIndex: 'title',
      width: 180, // 设置固定宽度
      ellipsis: true, // 超出部分显示省略号
      align: 'center', // 将文字设置为居中显示
      render: (title: string, record: Ticket) => (
        <Tooltip title={<div>
          <p><strong>告警名称:</strong> {title}</p>
          <p><strong>告警内容:</strong> {record.alarm_desc || '-'}</p>
          <p><strong>告警类别:</strong> {record.type_nm || '-'}</p>
          <p><strong>通知对象:</strong> {record.webhook || '-'}</p>
          <p><strong>告警次数:</strong> {record.alarm_num || 0}</p>
        </div>} placement="right">
          <a onClick={() => handleViewTicket(record.id)} style={{ cursor: 'pointer', display: 'block', textAlign: 'center' }}>{title}</a>
        </Tooltip>
      ),
    },
    {
      key: 'alarm_desc',
      title: '告警内容',
      dataIndex: 'alarm_desc',
      width: 200,
      ellipsis: true,
    },
    {
      key: 'service_name',
      title: '服务名称',
      dataIndex: 'service_name_display',
      width: 120,
      ellipsis: true,
    },
    {
      key: 'location',
      title: '园区',
      dataIndex: 'location',
      width: 100,
      ellipsis: true,
    },
    {
      key: 'factory',
      title: '厂区',
      dataIndex: 'factory',
      width: 100,
      ellipsis: true,
    },
    {
      key: 'bu',
      title: '业务单位',
      dataIndex: 'bu',
      width: 100,
      ellipsis: true,
    },
    {
      key: 'station',
      title: '工站',
      dataIndex: 'station',
      width: 100,
      ellipsis: true,
    },
    {
      key: 'responsible',
      title: '责任人',
      dataIndex: 'responsible_display',
      width: 120,
      ellipsis: true,
      render: (users: any[]) => {
        if (!users || users.length === 0) return '-';
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', maxWidth: '100%' }}>
            {users.map((user, idx) => (
              <Tooltip key={`tooltip-${user.empid || idx}`} title={<pre>{user.tooltip}</pre>}>
                <Tag key={`tag-${user.empid || idx}`} color="blue" style={{ margin: '0', padding: '0 4px', cursor: 'pointer' }}>
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
      width: 120,
      ellipsis: true,
      render: (users: any[]) => {
        if (!users || users.length === 0) return '-';
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', maxWidth: '100%' }}>
            {users.map((user, idx) => (
              <Tooltip key={`tooltip-handler-${user.empid || idx}`} title={<pre>{user.tooltip}</pre>}>
                <Tag key={`tag-handler-${user.empid || idx}`} color="green" style={{ margin: '0', padding: '0 4px', cursor: 'pointer' }}>
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
      width: 100,
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
      width: 100,
      ellipsis: true,
    },
    {
      key: 'webhook',
      title: '通知对象',
      dataIndex: 'webhook',
      width: 120,
      ellipsis: true,
    },
    {
      key: 'alarm_num',
      title: '告警次数',
      dataIndex: 'alarm_num',
      width: 90,
      render: (alarmNum: number | undefined) => alarmNum || 0,
    },
    {
      key: 'is_true',
      title: '是否真实异常',
      dataIndex: 'is_true',
      width: 110,
      render: (isTrue: boolean | null) => {
        if (isTrue === null) return '未确认';
        return isTrue ? '是' : '否';
      },
    },
    {
      key: 'is_need',
      title: '是否需要处理',
      dataIndex: 'is_need',
      width: 120,
      render: (isNeed: boolean | null) => {
        if (isNeed === null) return '未确认';
        return isNeed ? '是' : '否';
      },
    },
    {
      key: 'status',
      title: '异常单状态',
      dataIndex: 'status',
      width: 110,
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
      width: 150,
      ellipsis: true,
    },
    {
      key: 'updated_at',
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 150,
      ellipsis: true,
      render: (time: string | null) => time || '-',
    },
    {
      key: 'actions',
      title: '操作',
      width: 120, // 设置固定宽度
      fixed: 'right', // 固定在右侧，确保操作栏始终可见
      render: (_: any, record: Ticket) => (
        <Space size="small" wrap>
          {record.status !== 3 && (
            <>
              <Button
                type="link"
                size="small"
                onClick={() => handleViewTicket(record.id)}
                style={{ padding: '0 4px', minWidth: 'auto' }}
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
                trigger={['click']}
              >
                <Tooltip title="发送告警">
                  <Button
                    type="text"
                    size="small"
                    icon={<NotificationOutlined style={{ color: '#1890ff' }} />}
                    style={{ padding: '0 4px', minWidth: 'auto' }}
                  />
                </Tooltip>
              </Dropdown>
              
              {/* 设置按钮 */}
              {settingsMenuItems && settingsMenuItems.length > 0 && (
                <Dropdown menu={{ items: settingsMenuItems }} placement="bottomRight" arrow trigger={['click']}>
                  <Tooltip title="设置">
                    <Button
                      type="text"
                      size="small"
                      icon={<SettingOutlined style={{ color: '#1890ff' }} />}
                      style={{ padding: '0 4px', minWidth: 'auto' }}
                    />
                  </Tooltip>
                </Dropdown>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  // 根据visibleColumns的顺序返回列配置
  // 首先找到所有可见列
  let visibleColumnConfigs = visibleColumns
    .map(key => columnDefs.find(col => col.key === key))
    .filter(column => column); // 移除undefined列
  
  // 判断是否包含操作列
  const actionColumnIndex = visibleColumnConfigs.findIndex(col => col && col.key === 'actions');
  
  // 如果包含操作列，则将其从当前位置删除
  if (actionColumnIndex !== -1) {
    // 找到操作列的配置
    const actionColumn = visibleColumnConfigs[actionColumnIndex];
    
    // 从当前位置删除操作列
    visibleColumnConfigs.splice(actionColumnIndex, 1);
    
    // 在数组最后添加操作列，确保其始终显示在最右边
    visibleColumnConfigs.push(actionColumn);
  }
  
  return visibleColumnConfigs;
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
  { key: 'alarm_num', label: '告警次数' },
  { key: 'is_true', label: '是否真实异常' },
  { key: 'is_need', label: '是否需要处理' },
  { key: 'status', label: '异常单状态' },
  { key: 'created_at', label: '创建时间' },
  { key: 'updated_at', label: '更新时间' },
  { key: 'actions', label: '操作' },
];

// 默认可见列
export const initialVisibleColumns = [
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
  'alarm_num',
  'is_true',
  'is_need',
  'status',
  'created_at',
  'actions', // 即使在这里将操作列放在其他位置，我们的逻辑也会将其始终强制显示在最右边
];
