import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Dropdown, message } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';

interface HeaderBarProps {
  username: string;
  userDisplayName: string;
  onLogout: () => void;
}

const HeaderBar: React.FC<HeaderBarProps> = ({ 
  username, 
  userDisplayName, 
  onLogout 
}) => {
  return (
    <div className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
      <Link to="/tickets" className="text-2xl font-bold cursor-pointer hover:text-blue-200 text-white no-underline">
        工单管理平台
      </Link>
      <div className="flex items-center">
        <Dropdown 
          menu={{
            items: [
              {
                key: 'logout',
                icon: <LogoutOutlined />,
                label: '退出登录',
                onClick: onLogout
              }
            ]
          }} 
          placement="bottomRight" 
          trigger={['hover']}
        >
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="mr-2">{userDisplayName || username}</span>
            <Avatar icon={<UserOutlined />} />
          </div>
        </Dropdown>
      </div>
    </div>
  );
};

export default HeaderBar;