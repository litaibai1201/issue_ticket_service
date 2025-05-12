// src/api/index.ts
import axios from '../utils/axios';
import { Ticket, TicketFilter, TicketLog } from '../types/index';

export const searchData = (keyword: string) => {
  return axios.get('http://127.0.0.1:12337/api/searchData', { params: { keyword } });
};

// 根据工号获取用户信息
export const getUserInfoByWorkNo = (work_no: string) => {
  return axios.get('http://127.0.0.1:12337/api/searchData', { params: { work_no } });
};

export const searchUserNames = (empids: string[]) => {
  console.log('Calling searchUserNames API with empids:', empids);
  return axios.post('http://127.0.0.1:12337/api/searchUserName', { empids });
};


export const login = (username: string, password: string, location: string) => {
  return axios.post('/login', { work_no: username, password, location });
};

export const getTickets = (params: TicketFilter) => {
  console.log('API getTickets called with params:', params);
  return axios.get<{
    code: string;
    content: { datalist: Ticket[]; total_count: number }
  }>('/issues', { params });
};

export const getTicketById = (id: number) => {
  return axios.get(`/issues/${id}`);
};

export const getTicketLogs = (ticketId: number) => {
  return axios.get(`/issues/${ticketId}/logs`);
};

export const updateTicket = (
  id: number,
  data: Partial<Ticket> & { handle_data?: Partial<TicketLog> }
) => {
  console.log('updateTicket API called with data:', JSON.stringify(data, null, 2));
  return axios.put(`/issues/${id}/logs`, data);
};

export const getServiceName = (serviceToken: string) => {
  return axios.get(`/service_name/${serviceToken}`);
};
