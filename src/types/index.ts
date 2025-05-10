// src/types/index.ts
export interface User {
    id: number;
    username: string;
    name: string;
    work_no: string;
  }
  
  export interface Ticket {
    id: number;
    service_token: string;
    service_name: string;
    location: string;
    bu: string;
    factory: string;
    station: string;
    title: string;
    alarm_desc: string;
    level: number;
    type_nm: string;
    webhook: string;
    responsible: [string];
    handler: [string];
    is_true: boolean;
    is_need: boolean;
    status: number;
    created_at: string;
    updated_at: string;
  }
  
  export interface TicketLog {
    id: number;
    issue_id: number;
    start_time: string;
    end_time: string;
    abnormal: string;
    solve_result: string;
    handler: [string];
    created_at: string;
  }
  
  export interface TicketFilter {
    location?: string;
    factory?: string;
    bu?: string;
    status?: number;
    station?: string;
    work_no?: string;
    keyword?: string;
    page: number;
    size: number;
  }
  