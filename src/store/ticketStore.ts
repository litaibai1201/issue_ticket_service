// src/store/ticketStore.ts
import { Ticket } from '../types';

// 服务名称缓存接口
interface ServiceNameCache {
  [key: string]: string;
}


// 服务类型缓存接口
interface ServiceTypeCache {
  [key: string]: string;
}

// 用户名缓存接口
interface UserNameCache {
  [empid: string]: string;
}

// 简单的状态存储
class TicketStore {
  private tickets: Ticket[] = [];
  private currentTicket: Ticket | null = null;
  private serviceNameCache: ServiceNameCache = {};
  private userNameCache: UserNameCache = {};
  private serviceTypeCache: ServiceTypeCache = {};

  // 设置工单列表
  setTickets(tickets: Ticket[]) {
    this.tickets = tickets;
  }

  // 获取工单列表
  getTickets(): Ticket[] {
    return this.tickets;
  }

  // 根据ID获取工单
  getTicketById(id: number): Ticket | undefined {
    console.log(this.tickets)
    return this.tickets.find(ticket => ticket.id === id);
  }

  // 设置当前工单
  setCurrentTicket(ticket: Ticket) {
    this.currentTicket = ticket;
  }

  // 获取当前工单
  getCurrentTicket(): Ticket | null {
    return this.currentTicket;
  }

  // 清除当前工单
  clearCurrentTicket() {
    this.currentTicket = null;
  }

  // 更新单个工单
  updateTicket(updatedTicket: Ticket) {
    const index = this.tickets.findIndex(t => t.id === updatedTicket.id);
    if (index !== -1) {
      this.tickets[index] = updatedTicket;
    }

    // 如果是当前工单，也更新当前工单
    if (this.currentTicket && this.currentTicket.id === updatedTicket.id) {
      this.currentTicket = updatedTicket;
    }
  }

  // 缓存服务类型
  cacheServiceType(serviceToken: string, serviceType: string) {
    this.serviceTypeCache[serviceToken] = serviceType;
  }

  // 获取缓存的服务类型
  getCachedServiceType(serviceToken: string): string | null {
    return this.serviceTypeCache[serviceToken] || null;
  }

  // 缓存服务名称
  cacheServiceName(serviceToken: string, serviceName: string) {
    this.serviceNameCache[serviceToken] = serviceName;
  }

  // 获取缓存的服务名称
  getCachedServiceName(serviceToken: string): string | null {
    return this.serviceNameCache[serviceToken] || null;
  }

  // 检查服务名称是否已缓存
  hasServiceNameCached(serviceToken: string): boolean {
    return !!this.serviceNameCache[serviceToken];
  }

  // 缓存用户名称
  cacheUserName(empid: string, userName: string) {
    this.userNameCache[empid] = userName;
  }

  // 获取缓存的用户名称
  getCachedUserName(empid: string): string | null {
    return this.userNameCache[empid] || null;
  }

  // 检查用户名称是否已缓存
  hasUserNameCached(empid: string): boolean {
    return !!this.userNameCache[empid];
  }
}

// 创建单例实例
const ticketStore = new TicketStore();
export default ticketStore;
