// src/config/localeConfig.ts
import moment from 'moment';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'moment/locale/zh-cn';

// 确保 moment 设置为中文
moment.locale('zh-cn');

// 确保 dayjs 设置为中文
dayjs.locale('zh-cn');

// 自定义中文本地化设置
moment.updateLocale('zh-cn', {
  months: '一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月'.split('_'),
  monthsShort: '1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月'.split('_'),
  weekdays: '星期日_星期一_星期二_星期三_星期四_星期五_星期六'.split('_'),
  weekdaysShort: '周日_周一_周二_周三_周四_周五_周六'.split('_'),
  weekdaysMin: '日_一_二_三_四_五_六'.split('_'),
});

export { moment, dayjs };
