import { message } from 'antd';
import { debounce } from 'lodash';
import { searchData } from '../../api';

export interface WorkNoOption {
  value: string;
  label: string;
  name?: string;
  disabled?: boolean;
}

/**
 * 工号搜索处理函数 - 通用版本
 * @param value 搜索关键词
 * @param setOptions 设置选项的函数
 * @param setLoading 设置加载状态的函数
 */
export const handleWorkNoSearch = async (
  value: string,
  setOptions: (options: WorkNoOption[]) => void,
  setLoading: (loading: boolean) => void
) => {
  if (!value || value.trim() === '') {
    setOptions([]);
    return;
  }

  // 检查是否含有中文字符
  const hasChinese = /[\u4e00-\u9fa5]/.test(value);
  
  // 如果含有中文，且至少有一个中文字符，则允许搜索
  // 如果不含中文（数字或英文字符），长度必须超过5个才能搜索
  if ((hasChinese && value.trim().length >= 1) || (!hasChinese && value.trim().length > 5)) {
    setLoading(true);
    try {
      const response = await searchData(value);
      if (response.data && response.data.code === 'S10000' && Array.isArray(response.data.content)) {
        const data = response.data.content;
        // 按工号排序
        data.sort((a: { workno: string; }, b: { workno: any; }) => a.workno.localeCompare(b.workno));
        // 格式化选项，下拉选项显示部门信息，选择后只显示姓名
        const options = data.map((item: { dep3name: any; dep4name: any; dep6name: any; dep7name: any; chnname: any; workno: any; }) => {
          // 创建显示标签，仅包含非空值
          const nameParts = [];
          if (item.dep3name) nameParts.push(item.dep3name);
          if (item.dep4name) nameParts.push(item.dep4name);
          if (item.dep6name) nameParts.push(item.dep6name);
          if (item.dep7name) nameParts.push(item.dep7name);
          if (item.chnname) nameParts.push(item.chnname);
          
          const label = nameParts.join('-');
          
          return {
            value: item.workno,
            label: label,
            // 增加自定义属性存储姓名，用于选择后显示
            name: item.chnname || ''
          };
        });
        setOptions(options);
      } else {
        setOptions([]);
      }
    } catch (error) {
      console.error('Failed to fetch work_no data:', error);
      message.error('获取工号数据失败');
      setOptions([]);
    } finally {
      setLoading(false);
    }
  } else {
    // 如果不满足搜索条件，清空选项或设置提示
    if (!hasChinese) {
      setOptions([{
        value: '',
        label: '请输入至少6个字符',
        disabled: true
      }]);
    } else {
      setOptions([{
        value: '',
        label: '请至少输入一个中文字符',
        disabled: true
      }]);
    }
  }
};

/**
 * 创建一个带有防抖功能的工号搜索处理函数
 * @param setOptions 设置选项的函数
 * @param setLoading 设置加载状态的函数
 * @param debounceTime 防抖时间，默认300ms
 * @returns 防抖处理后的搜索函数
 */
export const createDebouncedWorkNoSearch = (
  setOptions: (options: WorkNoOption[]) => void,
  setLoading: (loading: boolean) => void,
  debounceTime: number = 300
) => {
  return debounce(async (value: string) => {
    await handleWorkNoSearch(value, setOptions, setLoading);
  }, debounceTime);
};
