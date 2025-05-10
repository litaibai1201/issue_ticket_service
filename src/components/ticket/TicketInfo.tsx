import React, { JSX } from 'react';
import { Card, Descriptions, Button, Tag, Tooltip } from 'antd';
import { Ticket } from '../../types';

interface TicketInfoProps {
  ticket: Ticket;
  serviceName: string;
  userNameMap: Record<string, string>;
  onBack: () => void;
}

const TicketInfo: React.FC<TicketInfoProps> = ({
  ticket,
  serviceName,
  userNameMap,
  onBack
}) => {
  // 渲染告警级别
  const renderAlarmLevel = (level: number): JSX.Element => {
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
  };
  
  // 处理工单状态
  const getStatusCode = (status: any): string => {
    if (status === null || status === undefined) return '';
    return status.toString();
  };
  
  const getStatusText = (status: any): string => {
    const statusCode = getStatusCode(status);
    
    switch (statusCode) {
      case '1':
      case 'pending':
        return '待处理';
      case '2':
      case 'processing':
        return '处理中';
      case '3':
      case 'completed':
        return '已完成';
      default:
        return '未知状态';
    }
  };
  
  const getStatusColor = (status: any): string => {
    const statusCode = getStatusCode(status);
    
    switch (statusCode) {
      case '1':
      case 'pending':
        return 'orange';
      case '2':
      case 'processing':
        return 'blue';
      case '3':
      case 'completed':
        return 'green';
      default:
        return 'gray';
    }
  };
  
  // 处理责任人显示
  const renderResponsible = (responsible: string[] | null | undefined): JSX.Element => {
    if (!responsible || !Array.isArray(responsible) || responsible.length === 0) return <span>-</span>;
    
    return (
      <div>
        {responsible.map((empid, idx) => {
          if (!empid || empid.trim() === '') return null;
          const name = userNameMap[empid] || empid;
          return (
            <Tooltip key={idx} title={<pre>{`工号: ${empid}${userNameMap[empid] ? `\n姓名: ${userNameMap[empid]}` : ''}`}</pre>}>
              <Tag color="blue" style={{ margin: '2px', cursor: 'pointer' }}>
                {userNameMap[empid] || empid}
              </Tag>
            </Tooltip>
          );
        })}
      </div>
    );
  };
  
  // 处理处理人显示
  const renderHandler = (handler: string[] | null | undefined): JSX.Element => {
    if (!handler || !Array.isArray(handler) || handler.length === 0) return <span>-</span>;
    
    return (
      <div>
        {handler.map((empid, idx) => {
          if (!empid || empid.trim() === '') return null;
          return (
            <Tooltip key={idx} title={<pre>{`工号: ${empid}${userNameMap[empid] ? `\n姓名: ${userNameMap[empid]}` : ''}`}</pre>}>
              <Tag color="green" style={{ margin: '2px', cursor: 'pointer' }}>
                {userNameMap[empid] || empid}
              </Tag>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>工单详情</span>
          <Button size="small" onClick={onBack}>返回列表</Button>
        </div>
      } 
      className="mb-4"
    >
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="工单ID">{ticket.id}</Descriptions.Item>
        <Descriptions.Item label="告警名称">
          {ticket.title}
        </Descriptions.Item>
        <Descriptions.Item label="告警内容">
          {ticket.alarm_desc}
        </Descriptions.Item>
        <Descriptions.Item label="服务编号">
          {ticket.service_token || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="服务名称">
          {serviceName || ticket.service_name || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="园区">
          {ticket.location}
        </Descriptions.Item>
        <Descriptions.Item label="厂区">
          {ticket.factory || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="业务单位">
          {ticket.bu}
        </Descriptions.Item>
        <Descriptions.Item label="工站">
          {ticket.station || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="责任人">
          {renderResponsible(ticket.responsible)}
        </Descriptions.Item>
        <Descriptions.Item label="处理人">
          {renderHandler(ticket.handler)}
        </Descriptions.Item>
        <Descriptions.Item label="告警级别">
          {renderAlarmLevel(ticket.level)}
        </Descriptions.Item>
        <Descriptions.Item label="告警类别">
          {ticket.type_nm || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="通知对象">
          {ticket.webhook || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="是否真实异常">
          {ticket.is_true === true ? '是' : 
           ticket.is_true === false ? '否' : '未确认'}
        </Descriptions.Item>
        <Descriptions.Item label="是否需要处理">
          {ticket.is_need === true ? '是' : 
           ticket.is_need === false ? '否' : '未确认'}
        </Descriptions.Item>
        <Descriptions.Item label="工单状态">
          <span style={{ color: getStatusColor(ticket.status) }}>
            {getStatusText(ticket.status)}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {ticket.created_at}
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          {ticket.updated_at || '-'}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
};

export default TicketInfo;