/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Radio, Select, Button, Row, Col, Card } from 'antd';
import moment from 'moment';
import { FormInstance } from 'antd/lib/form';
import locale from 'antd/es/locale/zh_CN';
import { WorkNoOption } from './WorkNoSearch';

const { TextArea } = Input;
const { Option } = Select;

export interface TicketFormValues {
  start_time?: moment.Moment;
  is_true?: number | string; // 1: 是, 0: 否
  abnormal?: string;
  is_need?: number | string; // 1: 是, 0: 否
  end_time?: moment.Moment;
  solve_result?: string;
  status?: number;
  responsible?: [string];
  handler?: Array<{key: string, value: string, label: string}> | string[];
}

interface TicketFormProps {
  form: FormInstance<any>;
  submitting: boolean;
  handlerOptions: WorkNoOption[];
  handlerLoading: boolean;
  onFinish: (values: TicketFormValues) => void;
  onHandlerSearch: (value: string) => void;
}

const TicketForm: React.FC<TicketFormProps> = ({
  form,
  submitting,
  handlerOptions,
  handlerLoading,
  onFinish,
  onHandlerSearch
}) => {
  // 添加状态来跟踪是否需要处理的选择
  const [isNeedToHandle, setIsNeedToHandle] = useState<boolean | undefined>(form.getFieldValue('is_need'));

  // 初始化状态
  useEffect(() => {
    const initialIsNeed = form.getFieldValue('is_need');
    // 兼容追的数字和布尔值
    const isTrueValue = initialIsNeed === true || initialIsNeed === 1;
    setIsNeedToHandle(isTrueValue);
    // 不再设置默认时间
  }, [form]);

  // 处理选择变化
  const handleIsNeedChange = (e: any) => {
    const newValue = e.target.value;
    // 将数字转换为布尔值进行判断
    const isTrueValue = newValue === 1;
    setIsNeedToHandle(isTrueValue);

    // 只在选择"否"时设置"无需处理"，不再设置默认时间
    if (newValue === 0) {
      form.setFieldsValue({
        end_time: undefined,
        solve_result: '无需处理' // 设置为"无需处理"而非清空
      });
    }
  };

  return (
    <Card title="异常单处理" className="mb-4">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <h3 className="font-bold mb-2">原因确认</h3>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="start_time"
              label="确认时间"
              rules={[{ required: true, message: '请选择确认时间' }]}
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                style={{ width: '100%' }}
                locale={locale}
                inputReadOnly
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="handler"
              label="处理人"
              rules={[{ required: true, message: '请选择处理人' }]}
            >
              <Select
                mode="multiple"
                showSearch
                placeholder="输入工号搜索处理人"
                defaultActiveFirstOption={false}
                suffixIcon={null}
                filterOption={false}
                onSearch={onHandlerSearch}
                notFoundContent={handlerLoading ? <span>加载中...</span> : <span>未找到</span>}
                options={handlerOptions}
                loading={handlerLoading}
                allowClear
                labelInValue
                optionLabelProp="name"
              />
            </Form.Item>
          </Col>
        </Row>

        <h3 className="font-bold mb-2 mt-4">异常分析</h3>
        <Form.Item
          name="is_true"
          rules={[{ required: true, message: '请选择是否真实异常' }]}
        >
          <div className="flex items-center">
            <span className="mr-4"><span className="text-red-500">*</span>是否真实异常：</span>
            <Radio.Group>
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </div>
        </Form.Item>

        <Form.Item
          name="abnormal"
          label="异常原因"
          rules={[{ required: true, message: '请输入异常原因' }]}
        >
          <TextArea rows={4} />
        </Form.Item>

        <h3 className="font-bold mb-2 mt-4">异常处理</h3>
        <Form.Item
          name="is_need"
          rules={[{ required: true, message: '请选择是否需要处理' }]}
        >
          <div className="flex items-center">
            <span className="mr-4"><span className="text-red-500">*</span>是否需要处理：</span>
            <Radio.Group onChange={handleIsNeedChange}>
              <Radio value={1}>是</Radio>
              <Radio value={0}>否</Radio>
            </Radio.Group>
          </div>
        </Form.Item>

        {/* 异常单状态和处理时间在同一行，处理时间仅在选择"需要处理"时显示 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="status"
              label="异常单状态"
              rules={[{ required: true, message: '请选择异常单状态' }]}
            >
              <Select>
                <Option value={1}>待处理</Option>
                <Option value={2}>处理中</Option>
                <Option value={3}>已完成</Option>
              </Select>
            </Form.Item>
          </Col>
          {isNeedToHandle === true && (
            <Col span={12}>
              <Form.Item name="end_time" label="处理时间">
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  style={{ width: '100%' }}
                  locale={locale}
                  inputReadOnly
                />
              </Form.Item>
            </Col>
          )}
        </Row>

        {/* 处理结果仅在选择"需要处理"时显示 */}
        {isNeedToHandle === true && (
          <Form.Item name="solve_result" label="处理结果">
            <TextArea rows={4} />
          </Form.Item>
        )}

        <Form.Item>
          <div className="flex justify-end">
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
            >
              提交
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TicketForm;
