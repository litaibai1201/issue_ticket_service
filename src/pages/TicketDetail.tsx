import React, { useEffect, useState, useRef, JSX } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Timeline,
  Form,
  Input,
  DatePicker,
  Radio,
  Select,
  Button,
  message,
  Dropdown,
  Descriptions,
  Avatar,
  ConfigProvider,
  Tag,
  Tooltip
} from 'antd';
import { getTicketById, updateTicket, getTicketLogs, getServiceName, searchUserNames, searchData } from '../api';
import { Ticket, TicketLog } from '../types';
import moment from 'moment';
import 'moment/locale/zh-cn';
// import locale from 'antd/es/date-picker/locale/zh_CN';
import zhCN from 'antd/es/locale/zh_CN';
import { ClockCircleOutlined, UserOutlined, LogoutOutlined, DownOutlined } from '@ant-design/icons';
import { getUserWorkNo } from '../utils/token';
import ticketStore from '../store/ticketStore';
import locale from 'antd/es/locale';

// 设置 moment 语言为中文
moment.locale('zh-cn');

const { TextArea } = Input;
const { Option } = Select;

interface FormValues {
  start_time: moment.Moment;
  is_true: boolean;
  abnormal: string;
  is_need: boolean;
  end_time: moment.Moment;
  solve_result: string;
  status: number;
  responsible: [string];
  handler: [string];
}

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
  const [form] = Form.useForm<FormValues>();
  const formRef = useRef(form);
  const navigate = useNavigate();
  
  // 工号搜索相关状态
  const [handlerOptions, setHandlerOptions] = useState<Array<{value: string, label: string}>>([]);
  const [handlerLoading, setHandlerLoading] = useState<boolean>(false);

  // 处理人工号搜索函数
  const handleWorkNoSearch = async (value: string) => {
    if (!value || value.trim() === '') {
      setHandlerOptions([]);
      return;
    }

    // 设置加载状态
    setHandlerLoading(true);

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
        
        // 更新选项
        setHandlerOptions(options);
      }
    } catch (error) {
      console.error(`Failed to fetch handler data:`, error);
      message.error(`获取处理人数据失败`);
      
      // 清空选项
      setHandlerOptions([]);
    } finally {
      // 重置加载状态
      setHandlerLoading(false);
    }
  };

  const fetchServiceName = async (serviceToken: string) => {
    try {
      const response = await getServiceName(serviceToken);
      if (response.data && response.data.content) {
        setServiceName(response.data.content);
      }
    } catch (error) {
      console.error('Failed to fetch service name:', error);
    }
  };

  // 获取用户名称
  const fetchUserNames = async (ticket: Ticket) => {
    // 从 store 引入缓存的用户名称
    const allEmpIds = new Set<string>();
    const newUserNameMap: Record<string, string> = {};
    
    // 先检查缓存中是否有这些用户名称
    if (ticket.responsible && Array.isArray(ticket.responsible)) {
      ticket.responsible.forEach(empid => {
        if (empid && empid.trim() !== '') {
          const cachedName = ticketStore.getCachedUserName(empid);
          if (cachedName) {
            newUserNameMap[empid] = cachedName;
          } else {
            allEmpIds.add(empid);
          }
        }
      });
    }
    
    if (ticket.handler && Array.isArray(ticket.handler)) {
      ticket.handler.forEach(empid => {
        if (empid && empid.trim() !== '') {
          const cachedName = ticketStore.getCachedUserName(empid);
          if (cachedName) {
            newUserNameMap[empid] = cachedName;
          } else {
            allEmpIds.add(empid);
          }
        }
      });
    }
    
    // 如果还有未缓存的用户名称，则调用 API 获取
    if (allEmpIds.size > 0) {
      try {
        const empIdsArray = Array.from(allEmpIds);
        const response = await searchUserNames(empIdsArray);
        
        if (response.data && response.data.content) {
          const apiUserNameMap = response.data.content;
          
          // 将 API 返回的用户名称缓存到 store
          Object.keys(apiUserNameMap).forEach(empid => {
            ticketStore.cacheUserName(empid, apiUserNameMap[empid]);
            newUserNameMap[empid] = apiUserNameMap[empid];
          });
        }
      } catch (error) {
        console.error('Failed to fetch user names:', error);
      }
    }
    
    // 更新状态
    setUserNameMap(prevMap => ({ ...prevMap, ...newUserNameMap }));
  };

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
            const response = await searchData(workNo);
            if (response.data && response.data.code === 'S10000' && 
                Array.isArray(response.data.content) && 
                response.data.content.length > 0) {
              const userData = response.data.content.find((item: any) => item.workno === workNo);
              if (userData && userData.chnname) {
                setUserDisplayName(userData.chnname);
                // 缓存用户名称
                ticketStore.cacheUserName(workNo, userData.chnname);
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

  // 表单初始化操作移到组件挂载后
  useEffect(() => {
    if (id) {
      // 先从缓存中获取工单数据
      const cachedTicket = ticketStore.getCurrentTicket() || 
                         (parseInt(id) ? ticketStore.getTicketById(parseInt(id)) : undefined);
      
      if (cachedTicket) {
        // 如果缓存中有数据，直接使用
        console.log('Using cached ticket data:', cachedTicket);
        setTicket(cachedTicket);
        
        // 如果有service_token，获取服务名称
        if (cachedTicket.service_token) {
          fetchServiceName(cachedTicket.service_token);
        }
        
        // 设置表单初始值
        formRef.current.setFieldsValue({
          is_true: cachedTicket.is_true,
          is_need: cachedTicket.is_need,
          status: cachedTicket.status,
          responsible: cachedTicket.responsible,
          handler: cachedTicket.handler
        });
        
        // 加载用户名称
        fetchUserNames(cachedTicket);
        
        // 仍然需要获取日志数据
        fetchTicketLogs(parseInt(id));
      } else {
        // 如果缓存中没有数据，通过API获取
        fetchTicketData(parseInt(id));
      }
    }
  }, [id]);  // 不要将form放入依赖数组

  const fetchTicketData = async (ticketId: number) => {
    setLoading(true);
    try {
      // 获取工单信息
      const ticketResponse = await getTicketById(ticketId);
      
      // 打印响应数据，查看数据结构
      console.log('Ticket API response:', ticketResponse);
      
      // 判断数据结构
      let ticketData;
      if (ticketResponse.data && ticketResponse.data.content) {
        // 如果数据在content字段中
        ticketData = ticketResponse.data.content;
      } else if (ticketResponse.data) {
        // 如果数据直接在data字段中
        ticketData = ticketResponse.data;
      } else {
        throw new Error('无法解析工单数据');
      }
      
      setTicket(ticketData);
      
      // 如果有service_token，获取服务名称
      if (ticketData.service_token) {
        fetchServiceName(ticketData.service_token);
      }
      
      // 将工单数据保存到store
      ticketStore.setCurrentTicket(ticketData);
      
      // 设置表单初始值
      formRef.current.setFieldsValue({
        is_true: ticketData.is_true,
        is_need: ticketData.is_need,
        status: ticketData.status,
        responsible: ticketData.responsible,
        handler: ticketData.handler
      });
      
      // 加载用户名称
      await fetchUserNames(ticketData);
      
      // 获取工单日志
      await fetchTicketLogs(ticketId);
    } catch (error) {
      console.error('Failed to fetch ticket data:', error);
      message.error('获取工单数据失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 清空处理日志相关字段
  const fetchTicketLogs = async (ticketId: number) => {
    try {
      // 获取日志数据
      const logsResponse = await getTicketLogs(ticketId);
      console.log('Logs API response:', logsResponse);
      
      let fetchedLogs = [];
      // 同样判断日志数据结构
      if (logsResponse.data && logsResponse.data.content) {
        fetchedLogs = logsResponse.data.content;
      } else if (Array.isArray(logsResponse.data)) {
        fetchedLogs = logsResponse.data;
      }
      
      // 处理日志中的处理人
      if (fetchedLogs.length > 0) {
        // 收集所有需要查询姓名的工号
        const handlerIds = new Set<string>();
        
        // 查找所有需要获取姓名的工号
        fetchedLogs.forEach(log => {
          // 日志中的处理人可能是数组，也可能是单个字符串
          if (log.handler) {
            if (Array.isArray(log.handler)) {
              log.handler.forEach((empid: string) => {
                if (empid && empid.trim() !== '' && !ticketStore.hasUserNameCached(empid)) {
                  handlerIds.add(empid);
                }
              });
            } else if (typeof log.handler === 'string' && log.handler.trim() !== '' && !ticketStore.hasUserNameCached(log.handler)) {
              handlerIds.add(log.handler);
            }
          }
        });
        
        // 如果有需要获取姓名的工号，调用 API
        if (handlerIds.size > 0) {
          try {
            const empIdsArray = Array.from(handlerIds);
            const response = await searchUserNames(empIdsArray);
            
            if (response.data && response.data.content) {
              const apiUserNameMap = response.data.content;
              
              // 将 API 返回的用户名称缓存到 store
              Object.keys(apiUserNameMap).forEach(empid => {
                ticketStore.cacheUserName(empid, apiUserNameMap[empid]);
              });
              
              // 更新用户名称映射
              setUserNameMap(prevMap => ({
                ...prevMap,
                ...apiUserNameMap
              }));
            }
          } catch (error) {
            console.error('Failed to fetch log handler names:', error);
          }
        }
      }
      
      // 设置日志数据
      setLogs(fetchedLogs);
    } catch (logError) {
      console.error('Failed to fetch logs:', logError);
      // 日志获取失败不应该阻止整个页面渲染
    }
  }

  const handleSubmit = async (values: FormValues) => {
    if (!id) return;

    setSubmitting(true);
    try {
      const payload = {
        is_true: values.is_true,
        is_need: values.is_need,
        status: values.status,
        responsible: values.responsible,
        handler: values.handler,
        log: {
          start_time: values.start_time
            ? values.start_time.format('YYYY-MM-DD HH:mm:ss')
            : undefined,
          end_time: values.end_time
            ? values.end_time.format('YYYY-MM-DD HH:mm:ss')
            : undefined,
          abnormal: values.abnormal,
          solve_result: values.solve_result,
          handler: values.handler || username, // 如果没有填写处理人，默认使用当前登录用户的工号
        },
      };

      const response = await updateTicket(parseInt(id), payload);
      message.success('工单更新成功');
      
      // 获取更新后的工单数据
      if (response && response.data) {
        const updatedTicket = response.data.content || response.data;
        
        // 更新store中的工单数据
        if (updatedTicket) {
          ticketStore.updateTicket(updatedTicket);
          setTicket(updatedTicket);
        } else {
          // 如果无法从响应中获取更新后的数据，继续使用API获取最新数据
          fetchTicketData(parseInt(id));
        }
      } else {
        // 如果没有响应数据，重新获取
        fetchTicketData(parseInt(id));
      }
      
      // 无论如何，都需要刷新日志数据
      fetchTicketLogs(parseInt(id)); 
      
      // 清空处理日志相关字段
      formRef.current.setFieldsValue({
        start_time: undefined,
        end_time: undefined,
        abnormal: '',
        solve_result: '',
        handler: []
      });
    } catch (error) {
      console.error('Failed to update ticket:', error);
      message.error('更新工单失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusCode = (status: any): string => {
    // 将状态转换为字符串
    if (status === null || status === undefined) return '';
    return status.toString();
  };
  
  const getStatusText = (status: any): string => {
    const statusCode = getStatusCode(status);
    
    // 根据状态码返回状态文本
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

  const isTicketCompleted = (status: any): boolean => {
    // 检查工单是否已完成
    if (status === 3 || status === '3') return true;
    if (status === 'completed') return true;
    
    return false;
  };

  const handleLogout = () => {
    // 清除token
    localStorage.removeItem('token');
    message.success('退出成功');
    navigate('/login');
  };

  if (loading || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">加载中...</div>
          <div className="text-gray-500">正在读取工单信息</div>
        </div>
      </div>
    );
  }
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
            <React.Fragment key={idx}>
              <Tooltip title={`工号: ${empid}`}>
                <Tag color="green" style={{ margin: '2px', cursor: 'pointer' }}>
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
      <Tooltip title={`工号: ${empid}`}>
        <Tag color="green" style={{ margin: '2px', cursor: 'pointer' }}>
          {name}
        </Tag>
      </Tooltip>
    );
  }
  
  // 其他情况
  return <span>{String(handler)}</span>;
};
  return (
    <ConfigProvider locale={zhCN}>
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
      <Row gutter={24}>
        <Col span={isTicketCompleted(ticket.status) ? 18 : 8}>
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>工单详情</span>
                <Button size="small" onClick={() => navigate('/tickets')}>返回列表</Button>
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
        </Col>

        <Col span={!isTicketCompleted(ticket.status) ? 10 : 0}>
          {!isTicketCompleted(ticket.status) ? (
            <Card title="工单处理" className="mb-4">
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
              >
                <h3 className="font-bold mb-2">原因确认</h3>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="start_time"
                      label="确认时间"
                      rules={[{ required: true, message: '请选择确认时间' }]}
                    >
                      <DatePicker
                        showTime
                        format="YYYY-MM-DD HH:mm:ss"
                        style={{ width: '100%' }}
                        locale={locale}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="handler"
                      label="处理人"
                      rules={[{ required: true, message: '请选择处理人' }]}
                    >
                      <Select
                        mode="multiple"
                        showSearch
                        placeholder="输入工号搜索处理人"
                        defaultActiveFirstOption={false}
                        showArrow={false}
                        filterOption={false}
                        onSearch={handleWorkNoSearch}
                        notFoundContent={handlerLoading ? <span>加载中...</span> : <span>未找到</span>}
                        options={handlerOptions}
                        loading={handlerLoading}
                        allowClear
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <h3 className="font-bold mb-2 mt-4">异常分析</h3>
                <Form.Item
                  name="is_true"
                  label="是否真实异常"
                  rules={[{ required: true, message: '请选择是否真实异常' }]}
                >
                  <Radio.Group>
                    <Radio value={true}>是</Radio>
                    <Radio value={false}>否</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  name="abnormal"
                  label="异常原因"
                  rules={[{ required: true, message: '请输入异常原因' }]}
                >
                  <TextArea rows={4} />
                </Form.Item>

                <h3 className="font-bold mb-2 mt-4">异常处理</h3>
                <Form.Item
                  name="is_need"
                  label="是否需要处理"
                  rules={[{ required: true, message: '请选择是否需要处理' }]}
                >
                  <Radio.Group>
                    <Radio value={true}>是</Radio>
                    <Radio value={false}>否</Radio>
                  </Radio.Group>
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="end_time" label="处理时间">
                      <DatePicker
                        showTime
                        format="YYYY-MM-DD HH:mm:ss"
                        style={{ width: '100%' }}
                        locale={locale}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="status"
                      label="工单状态"
                      rules={[{ required: true, message: '请选择工单状态' }]}
                    >
                      <Select>
                        <Option value={1}>待处理</Option>
                        <Option value={2}>处理中</Option>
                        <Option value={3}>已完成</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="solve_result" label="处理结果">
                  <TextArea rows={4} />
                </Form.Item>

                <Form.Item>
                  <div className="flex justify-end">
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                    >
                      提交
                    </Button>
                  </div>
                </Form.Item>
              </Form>
            </Card>
          ) : null}
        </Col>

        <Col span={isTicketCompleted(ticket.status) ? 6 : 6}>
          <Card title="处理时间轴" className="mb-4" style={{ height: '100%' }}>
            <Timeline mode="left">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <Timeline.Item
                    key={log.id}
                    dot={
                      index === logs.length - 1 ? (
                        <ClockCircleOutlined style={{ fontSize: '16px' }} />
                      ) : undefined
                    }
                    color={index === logs.length - 1 ? 'blue' : 'gray'}
                  >
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
                  </Timeline.Item>
                ))
              ) : (
                <div className="text-center text-gray-500">暂无处理记录</div>
              )}
            </Timeline>
          </Card>
        </Col>
      </Row>
      </div>
      </div>
    </ConfigProvider>
  );
};

export default TicketDetail;