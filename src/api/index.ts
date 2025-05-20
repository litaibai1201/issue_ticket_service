// src/api/index.ts
import apiHost from '../config/api'
import axios from '../utils/axios';
import { Ticket, TicketFilter, TicketLog } from '../types/index';

export const searchData = (keyword: string) => {
  return axios.get(`${apiHost.hrHost}/searchData`, { params: { keyword } });
};

export const searchUserData = (workno: string) => {
  return axios.get(`${apiHost.hrHost}/searchData`, { params: { workno } });
};

export const searchUserNames = (empids: string[]) => {
  return axios.post(`${apiHost.hrHost}/searchNameEmpid`, { empids });
};


export const login = (username: string, password: string, location: string) => {
  return axios.post(`${apiHost.host}/login`, { work_no: username, password, location });
};

export const getTickets = (params: TicketFilter) => {
  return axios.get<{
    code: string;
    content: { datalist: Ticket[]; total_count: number }
  }>(`${apiHost.host}/issues`, { params });
};

export const getTicketById = (id: string) => {
  return axios.get(`${apiHost.host}/issues/${id}`);
};

export const getTicketLogs = (ticketId: string) => {
  return axios.get(`${apiHost.host}/issues/${ticketId}/logs`);
};

export const updateTicket = (
  id: string,
  data: Partial<Ticket> & { handle_data?: Partial<TicketLog> }
) => {
  return axios.put(`${apiHost.host}/issues/${id}`, data);
};

export const getServiceName = (serviceToken: string) => {
  return axios.get(`${apiHost.host}/service_name/${serviceToken}`);
};

export const sendSingleAlarm = (data: FormData) => {
    // 如果是FormData，则需要取消默认的Content-Type，让浏览器自动设置
  return axios.post(`${apiHost.alarmHost}/sendSingleAlarm`, data, {
    headers: {
      'Content-Type': undefined // 让浏览器自动设置为multipart/form-data
    }
  });
};

export const sendGroupAlarmMsg = (data: {
  webhook: string;
  service_name: string;
  service_type: string;
  token: string;
  same_alarm_inter: number;
  type: string;
  markdown: {
    title: string;
    text: string;
    atuserids: {
      at: string[]
    };
  };
}) => {
  return axios.post(`${apiHost.alarmHost}/sendGroupAlarmMsg`, data);
};

export const getFilterData = () => {
  return axios.get<{
    code: string;
    content: {
      bu: string[];
      factory: string[];
      location: string[];
      service_token: string[];
      station: string[];
    }
  }>(`${apiHost.host}/get_filter_data`);
};
