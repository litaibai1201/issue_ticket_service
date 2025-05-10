import React from 'react';
import { Form, Input, DatePicker, Radio, Select, Button, Row, Col, Card } from 'antd';
import moment from 'moment';
import { FormInstance } from 'antd/lib/form';
import locale from 'antd/es/locale';
import { WorkNoOption } from './WorkNoSearch';

const { TextArea } = Input;
const { Option } = Select;

export interface TicketFormValues {
  start_time?: moment.Moment;
  is_true?: boolean;
  abnormal?: string;
  is_need?: boolean;
  end_time?: moment.Moment;
  solve_result?: string;
  status?: number;
  responsible?: string[];
  handler?: string[];
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
  return (
    <Card title="工单处理" className="mb-4">
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
                showArrow={false}
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
          label="是否真实异常"
          rules={[{ required: true, message: '请选择是否真实异常' }]}
        >
          <Radio.Group>
            <Radio value={true}>是</Radio>
            <Radio value={false}>否</Radio>
          </Radio.Group>
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
          label="是否需要处理"
          rules={[{ required: true, message: '请选择是否需要处理' }]}
        >
          <Radio.Group>
            <Radio value={true}>是</Radio>
            <Radio value={false}>否</Radio>
          </Radio.Group>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="end_time" label="处理时间">
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                style={{ width: '100%' }}
                locale={locale}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="status"
              label="工单状态"
              rules={[{ required: true, message: '请选择工单状态' }]}
            >
              <Select>
                <Option value={1}>待处理</Option>
                <Option value={2}>处理中</Option>
                <Option value={3}>已完成</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="solve_result" label="处理结果">
          <TextArea rows={4} />
        </Form.Item>

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