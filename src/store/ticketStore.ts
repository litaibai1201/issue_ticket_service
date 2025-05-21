// src/store/ticketStore.ts
import { Ticket, TicketFilter } from '../types';

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

// 白名单缓存接口
interface WhiteNameCache {
  [serviceToken: string]: string[];
}

// 简单的状态存储
class TicketStore {
  // 分页状态
  private pageState: TicketFilter = {
    page: 1,
    size: 10
  };
  private tickets: Ticket[] = [];
  private currentTicket: Ticket | null = null;
  private serviceNameCache: ServiceNameCache = {};
  private userNameCache: UserNameCache = {};
  private serviceTypeCache: ServiceTypeCache = {};
  private whiteNameCache: WhiteNameCache = {};

  // 设置异常单列表
  setTickets(tickets: Ticket[]) {
    this.tickets = tickets;
  }

  // 获取异常单列表
  getTickets(): Ticket[] {
    return this.tickets;
  }

  // 根据ID获取异常单
  getTicketById(id: number): Ticket | undefined {
    console.log(this.tickets)
    return this.tickets.find(ticket => ticket.id === id);
  }

  // 设置当前异常单
  setCurrentTicket(ticket: Ticket) {
    this.currentTicket = ticket;
  }

  // 获取当前异常单
  getCurrentTicket(): Ticket | null {
    return this.currentTicket;
  }

  // 清除当前异常单
  clearCurrentTicket() {
    this.currentTicket = null;
  }

  // 更新单个异常单
  updateTicket(updatedTicket: Ticket) {
    const index = this.tickets.findIndex(t => t.id === updatedTicket.id);
    if (index !== -1) {
      this.tickets[index] = updatedTicket;
    }

    // 如果是当前异常单，也更新当前异常单
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
  
  // 缓存白名单
  cacheWhiteNames(serviceToken: string, whiteNames: string[]) {
    this.whiteNameCache[serviceToken] = [...whiteNames];
  }
  
  // 获取缓存的白名单
  getCachedWhiteNames(serviceToken: string): string[] | null {
    return this.whiteNameCache[serviceToken] || null;
  }
  
  // 检查白名单是否已缓存
  hasWhiteNamesCached(serviceToken: string): boolean {
    return !!this.whiteNameCache[serviceToken];
  }
  
  // 更新白名单缓存
  updateWhiteNames(serviceToken: string, whiteNames: string[]) {
    this.whiteNameCache[serviceToken] = [...whiteNames];
  }
  
  // 清除所有白名单缓存
  clearWhiteNamesCache() {
    this.whiteNameCache = {};
  }
  
  // 保存分页状态
  savePageState(filter: TicketFilter) {
    this.pageState = { ...filter };
  }
  
  // 获取保存的分页状态
  getPageState(): TicketFilter {
    return { ...this.pageState };
  }
}

// 创建单例实例
const ticketStore = new TicketStore();
export default ticketStore;
