/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { Button, Form, Input, Select, Card, message } from 'antd';

const { Option } = Select;

interface LoginForm {
  username: string;
  password: string;
  location: string;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const locations = [
    { id: 1, name: '鵬鼎園區' },
    { id: 2, name: '禮鼎園區' },
    { id: 3, name: '大園園區' },
    { id: 4, name: '先豐園區' },
    { id: 5, name: '印度園區' },
  ];

  const handleSubmit = async (values: LoginForm) => {
    setLoading(true);

    try {
      const response = await login(
        values.username,
        values.password,
        values.location
      );
      localStorage.setItem('token', response.data.content);
      // 添加测试日志
      console.log('Token saved:', response.data.content);
      message.success('登录成功');
      navigate('/tickets');
    } catch (err: any) {
      console.error('Login error:', err);
      message.error(err.response?.data?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-96 shadow-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">异常单管理平台</h1>
          <p className="text-gray-500">请登录您的账号</p>
        </div>

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="用户名" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="密码" size="large" />
          </Form.Item>

          <Form.Item
            name="location"
            rules={[{ required: true, message: '請選擇園區' }]}
          >
            <Select placeholder="選擇園區" size="large">
              {locations.map((loc) => (
                <Option key={loc.id} value={loc.name}>
                  {loc.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
