/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Form,
  message,
  ConfigProvider
} from 'antd';
import { Ticket, TicketLog } from '../types';
import moment from 'moment';
import 'moment/locale/zh-cn';
import zhCN from 'antd/es/locale/zh_CN';
import { getUserWorkNo } from '../utils/token';
import ticketStore from '../store/ticketStore';
import { searchUserData } from '../api';

// 导入拆分出的组件
import HeaderBar from '../components/layout/HeaderBar';
import TicketInfo from '../components/ticket/TicketInfo';
import TicketForm, { TicketFormValues } from '../components/ticket/TicketForm';
import TicketTimeline from '../components/ticket/TicketTimeline';
import {
  fetchTicketData,
  fetchServiceName,
  fetchUserNames,
  fetchTicketLogs,
  submitTicketForm,
  handleWorkNoSearch,
  isTicketCompleted
} from '../components/ticket/TicketDetailService';

// 设置 moment 语言为中文
moment.locale('zh-cn');

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [logs, setLogs] = useState<TicketLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(''); // 存储工号
  const [userDisplayName, setUserDisplayName] = useState<string>(''); // 存储用户姓名
  const [serviceName, setServiceName] = useState<string>(''); // 存储服务名称
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({}); // 存储工号对应的姓名
  const [form] = Form.useForm<TicketFormValues>();
  // 使用 null 初始化 ref，在 useEffect 中设置值
  const formRef = useRef<any>(null);
  const navigate = useNavigate();
  const [formReady, setFormReady] = useState<boolean>(false);

  // 工号搜索相关状态
  const [handlerOptions, setHandlerOptions] = useState<Array<{value: string, label: string, name?: string, disabled?: boolean}>>([]);
  const [handlerLoading, setHandlerLoading] = useState<boolean>(false);

  // 在组件挂载后设置 formRef 的值
  useEffect(() => {
    // 确保挂载后立即设置表单引用并标记准备就绪
    formRef.current = form;
    setFormReady(true);
  }, [form]);

  // 处理工号搜索
  const handleWorkNoSearchWrapper = async (value: string) => {
    try {
      await handleWorkNoSearch(value, setHandlerOptions, setHandlerLoading);
    } catch (error) {
      console.error('Failed to search work numbers:', error);
      setHandlerLoading(false);
      message.error('搜索工号失败');
    }
  };

  // 获取用户名称包装函数
  const fetchUserNamesWrapper = async (ticket: Ticket) => {
    try {
      await fetchUserNames(ticket, setUserNameMap);
    } catch (error) {
      console.error('Failed to fetch user names:', error);
      // 用户名称加载失败不会阻止用户使用系统，因此不显示错误提示
    }
  };

  // 获取异常单日志包装函数
  const fetchTicketLogsWrapper = async (ticketId: string) => {
    try {
      await fetchTicketLogs(ticketId, setLogs, setUserNameMap);
    } catch (error) {
      console.error('Failed to fetch ticket logs:', error);
      message.error('加载异常单日志失败');
    }
  };

  // 获取异常单数据包装函数
  const fetchTicketDataWrapper = async (ticketId: string) => {
    try {
      await fetchTicketData(
        ticketId,
        setTicket,
        setLoading,
        setServiceName,
        setUserNameMap,
        fetchUserNamesWrapper,
        fetchTicketLogsWrapper,
        formRef
      );
    } catch (error) {
      console.error('Failed to fetch ticket data:', error);
      message.error('加载异常单数据失败，请刷新页面重试');
      setLoading(false);
    }
  };

  // 提交表单
  const handleSubmit = async (values: TicketFormValues) => {
    if (!id) {
      message.error('异常单ID无效');
      return;
    }

    try {
      await submitTicketForm(
        id,
        values,
        username,
        setSubmitting,
        setTicket,
        fetchTicketDataWrapper,
        fetchTicketLogsWrapper,
        formRef
      );
    } catch (error) {
      console.error('Failed to submit ticket form:', error);
      message.error('提交表单失败，请重试');
      setSubmitting(false);
    }
  };

  // 获取当前登录用户信息
  useEffect(() => {
    const workNo = getUserWorkNo();
    if (workNo) {
      setUsername(workNo);

      // 从缓存中获取用户名称，如果有的话
      const cachedUserName = ticketStore.getCachedUserName(workNo);
      if (cachedUserName) {
        setUserDisplayName(cachedUserName);
      } else {
        // 如果缓存中没有，尝试通过API获取
        const fetchUserInfo = async () => {
          try {
            const response = await searchUserData(workNo);
            if (response.data && response.data.code === 'S10000') {
              const userData = response.data.content;
              if (userData && userData.chnname) {
                setUserDisplayName(userData.chnname);
                // 缓存用户名称
                ticketStore.cacheUserName(workNo, userData.chnname);
              } else if (Array.isArray(response.data.content) && response.data.content.length > 0) {
                // 兼容数组结构的返回值
                const userDataArray = response.data.content.find((item: any) => item.workno === workNo);
                if (userDataArray && userDataArray.chnname) {
                  setUserDisplayName(userDataArray.chnname);
                  // 缓存用户名称
                  ticketStore.cacheUserName(workNo, userDataArray.chnname);
                }
              }
            }
          } catch (error) {
            console.error('Failed to fetch user name:', error);
          }
        };

        fetchUserInfo();
      }
    } else {
      // 如果没有token或解析失败，重定向到登录页
      navigate('/login');
    }
  }, [navigate]);

  // 设置默认处理人为当前登录用户的安全函数
  const safeSetDefaultHandler = () => {
    if (!formRef.current) {
      console.warn('Form ref not available for setting default handler');
      return;
    }

    try {
      const currentFormValues = formRef.current.getFieldsValue();
      formRef.current.setFieldsValue({
        ...currentFormValues,
        status: 3, // 默认选中"已完成"
        handler: [{key: username, value: username, label: userDisplayName || username}]
      });
      console.log('Set default handler with username:', username, 'displayName:', userDisplayName);
    } catch (error) {
      console.error('Failed to set default handler:', error);
    }
  };

  // 在用户名和表单都准备好后初始化表单
  useEffect(() => {
    if (!id || !username || !formReady) return;

    // 先从缓存中获取异常单数据
    const cachedTicket = ticketStore.getCurrentTicket() ||
                        (parseInt(id) ? ticketStore.getTicketById(parseInt(id)) : undefined);

    if (cachedTicket) {
      // 如果缓存中有数据，直接使用
      setTicket(cachedTicket);

      // 如果有service_token，获取服务名称
      if (cachedTicket.service_token) {
        try {
          fetchServiceName(cachedTicket.service_token, setServiceName);
        } catch (error) {
          console.error('Failed to fetch service name:', error);
        }
      }

      // 设置表单初始值
      try {
        if (formRef.current) {
          formRef.current.setFieldsValue({
            is_true: cachedTicket.is_true === 1 ? 1 : 0,
            is_need: cachedTicket.is_need === 1 ? 1 : 0,
            responsible: cachedTicket.responsible
          });

          // 设置默认处理人为当前登录用户和默认状态
          setTimeout(safeSetDefaultHandler, 300); // 增加延时确保表单完全加载
        } else {
          console.warn('Form ref not available for setting initial values');
        }
      } catch (error) {
        console.error('Failed to set form initial values:', error);
      }

      // 加载用户名称
      fetchUserNamesWrapper(cachedTicket);

      // 仍然需要获取日志数据
      fetchTicketLogsWrapper(id);
    } else {
      // 如果缓存中没有数据，通过API获取
      fetchTicketDataWrapper(id);

      // 确保默认处理人设置在API加载后
      setTimeout(safeSetDefaultHandler, 800); // 增大延时，确保数据加载完成
    }

    // 添加生命周期装载状态检测
    setTimeout(() => {
      if (loading) {
        console.warn('Loading state is still true after timeout, forcing reset');
        setLoading(false);
      }
    }, 10000); // 10秒后如果仍然在加载中，强制重置加载状态
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, username, userDisplayName, formReady]);

  const handleLogout = () => {
    // 清除token
    localStorage.removeItem('token');
    message.success('退出成功');
    navigate('/login');
  };

  const handleBackToList = () => {
    navigate('/tickets');
  };

  if (loading || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">加载中...</div>
          <div className="text-gray-500">正在读取异常单信息</div>
        </div>
      </div>
    );
  }

  // 检查异常单是否已完成
  const ticketCompleted = ticket ? isTicketCompleted(ticket.status) : false;

  return (
    <ConfigProvider locale={zhCN}>
      <div>
        <HeaderBar
          username={username}
          userDisplayName={userDisplayName}
          onLogout={handleLogout}
        />

        <div className="p-6">
          <Row gutter={24}>
            <Col span={ticketCompleted ? 18 : 8}>
              <TicketInfo
                ticket={ticket}
                serviceName={serviceName}
                userNameMap={userNameMap}
                onBack={handleBackToList}
              />
            </Col>

            <Col span={ticketCompleted ? 0 : 10}>
              {!ticketCompleted ? (
                <TicketForm
                  form={form}
                  submitting={submitting}
                  handlerOptions={handlerOptions}
                  handlerLoading={handlerLoading}
                  onFinish={handleSubmit}
                  onHandlerSearch={handleWorkNoSearchWrapper}
                />
              ) : null}
            </Col>

            <Col span={ticketCompleted ? 6 : 6}>
              <TicketTimeline
                logs={logs}
                userNameMap={userNameMap}
                setUserNameMap={setUserNameMap}
              />
            </Col>
          </Row>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default TicketDetail;
