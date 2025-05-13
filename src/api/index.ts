// src/api/index.ts
import apiHost from '../config/api'
import axios from '../utils/axios';
import { Ticket, TicketFilter, TicketLog } from '../types/index';

export const searchData = (keyword?: string, workno?: string) => {
  return axios.get(`${apiHost.hrHost}/searchData`, { params: { keyword, workno } });
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
  return axios.get(`/issues/${id}`);
};

export const getTicketLogs = (ticketId: string) => {
  return axios.get(`/issues/${ticketId}/logs`);
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
