import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button, Checkbox, Popover } from 'antd';
import { SettingOutlined, ReloadOutlined, MenuOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { initialVisibleColumns } from './TicketTableColumns';

interface ColumnItem {
  key: string;
  label: string;
}

interface ColumnSettingsProps {
  allColumnItems: ColumnItem[];
  visibleColumns: string[];
  setVisibleColumns: (columns: string[]) => void;
}

const ColumnSettings: React.FC<ColumnSettingsProps> = ({
  allColumnItems,
  visibleColumns,
  setVisibleColumns
}) => {
  const [columnsModalVisible, setColumnsModalVisible] = useState<boolean>(false);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const visibleColumnsRef = useRef<string[]>(visibleColumns);
  const listPositionRef = useRef<Map<string, DOMRect>>(new Map());
  const [visibleItemsRange, setVisibleItemsRange] = useState({ start: 0, end: 50 });

  // 同步ref和state
  useEffect(() => {
    visibleColumnsRef.current = visibleColumns;
    // 在列表更新后捕获新的元素位置
    requestAnimationFrame(() => {
      listPositionRef.current = captureItemPositions();
    });
  }, [visibleColumns]);

  // 记录列表项初始位置，用于计算动画
  const captureItemPositions = () => {
    const newPositions = new Map<string, DOMRect>();
    document.querySelectorAll('.drag-item').forEach((item) => {
      const key = item.getAttribute('data-key');
      if (key) {
        newPositions.set(key, item.getBoundingClientRect());
      }
    });
    return newPositions;
  };

  // 防抖处理函数，提高性能
  const debouncedUpdateVisibleColumns = useCallback(
    _.debounce((newColumns: string[]) => {
      setVisibleColumns(newColumns);
    }, 20),
    [setVisibleColumns]
  );

  // 视觉效果优化
  const applyPositionTransition = useCallback(() => {
    const oldPositions = listPositionRef.current;
    const newPositions = captureItemPositions();
    
    // 应用过渡效果
    document.querySelectorAll('.drag-item').forEach((item) => {
      const key = item.getAttribute('data-key');
      if (key && oldPositions.has(key)) {
        const oldPos = oldPositions.get(key)!;
        const newPos = newPositions.get(key);
        
        if (newPos) {
          // 计算位移
          const deltaX = oldPos.left - newPos.left;
          const deltaY = oldPos.top - newPos.top;
          
          if (Math.abs(deltaY) > 5) { // 只对有显著位置变化的元素应用动画
            // 应用反向位移，准备动画
            const htmlItem = item as HTMLElement;
            htmlItem.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            htmlItem.style.transition = 'none';
            
            // 强制重绘以应用初始位置
            void htmlItem.offsetWidth;
            
            // 添加过渡效果并重置位置
            htmlItem.style.transition = 'transform 300ms ease-out';
            requestAnimationFrame(() => {
              htmlItem.style.transform = '';
            });
          }
        }
      }
    });
  }, []);

  

  // 使用useMemo缓存列表内容，避免频繁重新计算
  const memoizedColumnItems = useMemo(() => {
    // 使用Set快速检查列是否可见
    const visibleSet = new Set(visibleColumns);
    
    // 创建映射表以快速查找排序索引
    const indexMap: Record<string, number> = {};
    visibleColumns.forEach((col, index) => {
      indexMap[col] = index;
    });
    
    // 分类并排序列项
    const visibleItems: { index: any; key: string; label: string; }[] = [];
    const hiddenItems: { key: string; label: string; }[] = [];
    
    allColumnItems.forEach(item => {
      if (visibleSet.has(item.key)) {
        visibleItems.push({
          ...item,
          index: indexMap[item.key]
        });
      } else {
        hiddenItems.push(item);
      }
    });
    
    // 使用稳定排序算法按列索引排序
    visibleItems.sort((a, b) => a.index - b.index);
    
    // 返回排序后的列表，先可见项目，后不可见项目
    return [...visibleItems, ...hiddenItems];
  }, [visibleColumns, allColumnItems]);

  // 实现虚拟列表的数据
  const visibleItems = useMemo(() => {
    // 在拖拽过程中不使用虚拟列表，确保所有元素都被渲染
    if (draggingItem || dragOverItem) {
      return memoizedColumnItems;
    }
    
    // 仅渲染可见区域
    return memoizedColumnItems.slice(visibleItemsRange.start, visibleItemsRange.end + 1);
  }, [memoizedColumnItems, visibleItemsRange, draggingItem, dragOverItem]);

  // 滚动时更新可见范围
  const handleScroll = useCallback(_.throttle(() => {
    if (listContainerRef.current) {
      const container = listContainerRef.current;
      const containerTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      // 假设每个项目的高度为40px
      const itemHeight = 40;
      const buffer = 8; // 增加缓冲区域，上下各多渲染8个项，减少滚动时的空白
      
      const startIndex = Math.max(0, Math.floor(containerTop / itemHeight) - buffer);
      const endIndex = Math.min(
        memoizedColumnItems.length - 1, 
        Math.ceil((containerTop + containerHeight) / itemHeight) + buffer
      );
      
      // 仅当范围发生变化时才更新状态，减少重新渲染
      if (startIndex !== visibleItemsRange.start || endIndex !== visibleItemsRange.end) {
        setVisibleItemsRange({ start: startIndex, end: endIndex });
      }
    }
  }, 50), [memoizedColumnItems.length, visibleItemsRange]);

  // 滚动时更新可见范围
  useEffect(() => {
    const listContainer = listContainerRef.current;
    if (listContainer) {
      listContainer.addEventListener('scroll', handleScroll);
      // 初始计算可见区域
      handleScroll();
      
      return () => {
        listContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  // 列表高度占位元素
  const listHeight = memoizedColumnItems.length * 40; // 假设每个项目高度为40px

  // 切换列可见性
  const toggleColumnVisibility = (column: string) => {
    // 如果是操作列，不允许隐藏
    if (column === 'actions') {
      return;
    }
    
    if (visibleColumns.includes(column)) {
      const newColumns = visibleColumns.filter((col) => col !== column);
      setVisibleColumns(newColumns);
      localStorage.setItem('ticketListVisibleColumns', JSON.stringify(newColumns));
    } else {
      const newColumns = [...visibleColumns, column];
      setVisibleColumns(newColumns);
      localStorage.setItem('ticketListVisibleColumns', JSON.stringify(newColumns));
    }
  };

  // 拖拽开始时的处理
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, key: string) => {
    // 如果是操作列，不允许拖拽
    if (key === 'actions') {
      e.preventDefault();
      return;
    }
    
    // 使用dataTransfer保存更多信息
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'move';
    
    // 设置拖拽元素样式
    const target = e.currentTarget;
    requestAnimationFrame(() => {
      target.style.opacity = '0.4';
      target.style.transform = 'scale(1.03)';
    });
    
    // 设置拖拽状态，但避免重新渲染
    setDraggingItem(key);
  }, []);

  // 拖拽过程中的处理
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 性能优化：使用节流避免频繁状态更新
    if (dragOverItem !== key) {
      setDragOverItem(key);
    }
  }, [dragOverItem]);
  
  // 通过DOM操作预览拖拽位置，避免频繁渲染
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>, key: string) => {
    e.preventDefault();
    if (key !== draggingItem) {
      // 目标元素添加视觉提示
      e.currentTarget.style.backgroundColor = '#f0f0f0';
      e.currentTarget.style.borderTop = '2px solid #1890ff';
    }
  }, [draggingItem]);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // 恢复原始样式
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.borderTop = '1px solid transparent';
  }, []);

  // 拖拽结束时的处理
  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // 处理元素样式恢复
    const target = e.currentTarget;
    target.style.opacity = '1';
    target.style.transform = 'scale(1)';
    
    // 如果有有效的拖拽和放置
    if (draggingItem && dragOverItem && draggingItem !== dragOverItem) {
      // 在更新之前捕获当前元素位置，用于日后的视觉过渡
      listPositionRef.current = captureItemPositions();
      
      // 计算拖拽项和目标项的位置
      const dragItemIndex = visibleColumnsRef.current.indexOf(draggingItem);
      const dropItemIndex = visibleColumnsRef.current.indexOf(dragOverItem);
      
      if (dragItemIndex !== -1 && dropItemIndex !== -1) {
        // 创建新数组，但不触发重新渲染
        const newVisibleColumns = [...visibleColumnsRef.current];
        newVisibleColumns.splice(dragItemIndex, 1);
        
        // 计算实际插入位置
        let insertIndex = dropItemIndex;
        if (dragItemIndex < dropItemIndex) {
          insertIndex = dropItemIndex - 1;
        }
        newVisibleColumns.splice(insertIndex, 0, draggingItem);
        
        // 先更新ref，避免闭包陷阱
        visibleColumnsRef.current = newVisibleColumns;
        
        // 先保存到localStorage
        localStorage.setItem('ticketListVisibleColumns', JSON.stringify(newVisibleColumns));
        
        // 使用防抖函数更新UI状态
        debouncedUpdateVisibleColumns(newVisibleColumns);
        
        // 在下一帧应用动画效果
        requestAnimationFrame(() => {
          setTimeout(applyPositionTransition, 10);
        });
      }
    }
    
    // 重置拖拽状态
    setDraggingItem(null);
    setDragOverItem(null);
    
    // 恢复所有列表项的样式
    const dragItems = document.querySelectorAll('.drag-item');
    dragItems.forEach((item) => {
      (item as HTMLElement).style.backgroundColor = 'transparent';
      (item as HTMLElement).style.borderTop = '1px solid transparent';
    });
  }, [draggingItem, dragOverItem, debouncedUpdateVisibleColumns, applyPositionTransition]);

  // 重置列设置
  const handleResetColumns = () => {
    setVisibleColumns(initialVisibleColumns);
    localStorage.removeItem('ticketListVisibleColumns');
  };

  return (
    <Popover
      content={
        <div style={{ width: '180px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>显示列设置</span>
            <Button 
              type="text" 
              size="small" 
              icon={<ReloadOutlined />} 
              onClick={handleResetColumns}
            >
              重置
            </Button>
          </div>
          <div 
            ref={listContainerRef}
            style={{ maxHeight: '300px', overflow: 'auto', contain: 'paint layout style' }} 
            className="column-list-container"
          >
            <div style={{ height: `${listHeight}px`, position: 'relative', width: '100%' }}>
              {visibleItems.map((item) => {
                // 计算每个项目的位置
                const itemIndex = memoizedColumnItems.indexOf(item);
                const offsetTop = itemIndex * 40;
                
                return (
                  <div 
                    key={item.key}
                    className="drag-item"
                    data-key={item.key}
                    style={{ 
                      position: 'absolute',
                      top: `${offsetTop}px`,
                      left: 0,
                      right: 0,
                      height: '40px',
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '4px 8px',
                      cursor: visibleColumns.includes(item.key) && item.key !== 'actions' ? 'move' : 'default',
                      boxShadow: dragOverItem === item.key ? '0 0 5px rgba(24, 144, 255, 0.5)' : 'none',
                      transition: 'transform 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease, box-shadow 0.2s ease',
                      userSelect: 'none', // 防止文本选择影响拖拽
                      willChange: 'transform, opacity', // 告知浏览器这些属性将会变化
                      zIndex: draggingItem === item.key ? 10 : 1, // 拖拽项提升层级
                      backgroundColor: '#ffffff', // 设置背景色强调层次感
                      margin: 0,
                    }}
                    draggable={visibleColumns.includes(item.key) && item.key !== 'actions'}
                    onDragStart={(e) => handleDragStart(e, item.key)}
                    onDragOver={(e) => handleDragOver(e, item.key)}
                    onDragEnter={(e) => handleDragEnter(e, item.key)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                  >
                    <Checkbox
                      checked={visibleColumns.includes(item.key)}
                      onChange={() => toggleColumnVisibility(item.key)}
                    >
                      {item.label}
                    </Checkbox>
                    {visibleColumns.includes(item.key) && item.key !== 'actions' && (
                      <MenuOutlined style={{ color: '#999', cursor: 'grab' }} />
                    )}
                    {item.key === 'actions' && visibleColumns.includes(item.key) && (
                      <span style={{ color: '#999', fontSize: '12px' }}>固定列</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      }
      trigger="click"
      placement="bottomRight"
      open={columnsModalVisible}
      onOpenChange={(visible) => setColumnsModalVisible(visible)}
    >
      <Button icon={<SettingOutlined />}>
        显示列设置
      </Button>
    </Popover>
  );
};

export default ColumnSettings;