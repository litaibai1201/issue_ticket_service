import React, { useState, useEffect, JSX } from 'react';
import { Card, Timeline, Tag, Tooltip } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { TicketLog } from '../../types';
import { searchUserNames } from '../../api';
import ticketStore from '../../store/ticketStore';

interface TicketTimelineProps {
  logs: TicketLog[];
  userNameMap: Record<string, string>;
  setUserNameMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const TicketTimeline: React.FC<TicketTimelineProps> = ({
  logs,
  userNameMap,
  setUserNameMap
}) => {
  // 处理时间轴中的处理人显示
  const renderTimelineHandler = (handler: string | string[]): JSX.Element => {
    if (!handler) return <span>-</span>;
    
    // 获取处理人姓名（如果缓存中没有则调用接口获取）
    const getHandlerName = (empid: string): string => {
      // 如果缓存中存在，直接返回
      if (userNameMap[empid]) {
        return userNameMap[empid];
      }
      
      // 如果缓存中不存在，从缓存中查询
      const cachedName = ticketStore.getCachedUserName(empid);
      if (cachedName) {
        // 更新本地缓存
        setUserNameMap(prev => ({ ...prev, [empid]: cachedName }));
        return cachedName;
      }
      
      // 如果缓存中还是没有，则调用接口获取
      // 注意：这里是异步操作，不会立即获取到结果
      (async () => {
        try {
          const response = await searchUserNames([empid]);
          
          if (response.data && response.data.content) {
            const apiUserNameMap = response.data.content;
            if (apiUserNameMap[empid]) {
              // 将名称缓存到 store
              ticketStore.cacheUserName(empid, apiUserNameMap[empid]);
              
              // 更新状态
              setUserNameMap(prev => ({ ...prev, [empid]: apiUserNameMap[empid] }));
            }
          }
        } catch (error) {
          console.error(`Failed to fetch user name for ${empid}:`, error);
        }
      })();
      
      // 在获取到结果前，先显示工号
      return empid;
    };
    
    // 处理多个处理人（数组形式）
    if (Array.isArray(handler)) {
      if (handler.length === 0) return <span>-</span>;
      
      return (
        <span>
          {handler.map((empid, idx) => {
            if (!empid || empid.trim() === '') return null;
            const name = getHandlerName(empid); // 获取姓名，优先使用缓存
            return (
              <React.Fragment key={`handler-${empid}-${idx}`}>
                <Tooltip key={`tooltip-${empid}`} title={`工号: ${empid}`}>
                  <Tag key={`tag-${empid}`} color="green" style={{ margin: '2px', cursor: 'pointer' }}>
                    {name}
                  </Tag>
                </Tooltip>
                {idx < handler.length - 1 && ' '}
              </React.Fragment>
            );
          })}
        </span>
      );
    }
    
    // 处理单个处理人（字符串形式）
    if (typeof handler === 'string' && handler.trim() !== '') {
      const empid = handler.trim();
      const name = getHandlerName(empid); // 获取姓名，优先使用缓存
      
      return (
        <Tooltip key={`tooltip-${empid}`} title={`工号: ${empid}`}>
          <Tag key={`tag-${empid}`} color="green" style={{ margin: '2px', cursor: 'pointer' }}>
            {name}
          </Tag>
        </Tooltip>
      );
    }
    
    // 其他情况
    return <span>{String(handler)}</span>;
  };

  // 创建 Timeline items
  const timelineItems = logs.length > 0 
    ? logs.map((log, index) => ({
        key: log.id,
        dot: index === logs.length - 1 ? <ClockCircleOutlined style={{ fontSize: '16px' }} /> : undefined,
        color: index === logs.length - 1 ? 'blue' : 'gray',
        children: (
          <>
            <p>
              <strong>确认时间:</strong> {log.start_time}
            </p>
            {log.end_time && (
              <p>
                <strong>处理时间:</strong> {log.end_time}
              </p>
            )}
            <p>
              <strong>异常原因:</strong> {log.abnormal}
            </p>
            {log.solve_result && (
              <p>
                <strong>处理结果:</strong> {log.solve_result}
              </p>
            )}
            <p>
              <strong>处理人:</strong> {renderTimelineHandler(log.handler)}
            </p>
            <p className="text-gray-500">{log.created_at}</p>
          </>
        )
      }))
    : [];

  return (
    <Card title="处理时间轴" className="mb-4" style={{ height: '100%' }}>
      {logs.length > 0 ? (
        <Timeline mode="left" items={timelineItems} />
      ) : (
        <div className="text-center text-gray-500">暂无处理记录</div>
      )}
    </Card>
  );
};

export default TicketTimeline;