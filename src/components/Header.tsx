// src/components/Header.tsx
import React from 'react';
import { Layout, Menu, Dropdown, Button } from 'antd';
import { DownOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menu = (
    <Menu>
      <Menu.Item key="1" icon={<UserOutlined />}>
        {user.name || user.username || '用户'}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="2" onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  return (
    <AntHeader className="bg-white flex justify-between items-center px-6 shadow-sm">
      <div className="text-xl font-bold">工单平台</div>
      <Dropdown overlay={menu}>
        <Button type="link">
          {user.name || user.username || '用户'} <DownOutlined />
        </Button>
      </Dropdown>
    </AntHeader>
  );
};

export default Header;
