import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from 'antd';

const { Header } = Layout;

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 根据当前路径判断颜色
  const getHeaderStyle = () => {
    if (location.pathname.includes('/tickets/')) {
      return { backgroundColor: '#1890ff' };
    }
    return { backgroundColor: '#52c41a' };
  };

  return (
    <Header style={{
      ...getHeaderStyle(),
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
    }}>
      <div 
        onClick={() => navigate('/tickets')}
        style={{
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        工单管理系统
      </div>
    </Header>
  );
};

export default Navbar;