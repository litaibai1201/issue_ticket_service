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

export const sendSingleAlarm = (data: {
  userids: string[];
  service_name: string;
  service_type: string;
  token: string;
  same_alarm_inter: number;
  type: string;
  link: {
    title: string;
    text: string;
    url: string;
  };
}) => {
  return axios.post(`${apiHost.hrHost}/sendSingleAlarm`, data);
};
