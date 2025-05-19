/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Form, Input, Select, Row, Col } from 'antd';
import { WorkNoOption } from './WorkNoSearch';

const { Search } = Input;
const { Option } = Select;

interface TicketFilterFormProps {
   
  form: any; // Form 实例
  onFilter: (values: any) => void;
  onSearch: (keyword: string) => void;
  onFormValuesChange: (changedValues: any, allValues: any) => void;
  handleWorkNoSearch: (value: string) => void;
  workNoOptions: WorkNoOption[];
  workNoLoading: boolean;
}

// 下拉选项数据
const factories = [
  { id: '1', name: '一厂' },
  { id: '2', name: '二厂' },
  { id: '3', name: '三厂' },
];

const locations = [
  { id: '1', name: '鹏鼎园区' },
  { id: '2', name: '礼鼎园区' },
];

const businessUnits = [
  { id: '1', name: 'BU1' },
  { id: '2', name: 'BU2' },
  { id: '3', name: 'BU3' },
];

const statuses = [
  { id: '1', name: '待处理' },
  { id: '2', name: '处理中' },
  { id: '3', name: '已完成' },
];

const TicketFilterForm: React.FC<TicketFilterFormProps> = ({
  form,
  onFilter,
  onSearch,
  onFormValuesChange,
  handleWorkNoSearch,
  workNoOptions,
  workNoLoading,
}) => {
  return (
    <Form
      form={form}
      layout="horizontal"
      onFinish={(values) => onFilter(values)}
      initialValues={{ location: '', factory: '', bu: '', status: '', work_no: '', station: '', keyword: '' }}
      onValuesChange={onFormValuesChange}
    >
      <Row gutter={16}>
        <Col xs={24} sm={12} md={4}>
          <Form.Item name="location" label="园区">
            <Select placeholder="选择园区" allowClear>
              {locations.map((loc) => (
                <Option key={loc.id} value={loc.id}>
                  {loc.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Form.Item name="factory" label="厂区">
            <Select placeholder="选择厂区" allowClear>
              {factories.map((factory) => (
                <Option key={factory.id} value={factory.id}>
                  {factory.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Form.Item name="bu" label="业务单位">
            <Select placeholder="选择业务单位" allowClear>
              {businessUnits.map((bu) => (
                <Option key={bu.id} value={bu.id}>
                  {bu.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Form.Item name="station" label="工站">
            <Select placeholder="选择工站" allowClear>
              <Option value="station1">工站 1</Option>
              <Option value="station2">工站 2</Option>
              <Option value="station3">工站 3</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Form.Item name="status" label="异常单状态">
            <Select placeholder="选择状态" allowClear>
              {statuses.map((status) => (
                <Option key={status.id} value={status.id}>
                  {status.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Form.Item name="work_no" label="工号">
            <Select
              showSearch
              placeholder="输入工号"
              defaultActiveFirstOption={false}
              filterOption={false}
              onSearch={handleWorkNoSearch}
              notFoundContent={workNoLoading ? <span>加载中...</span> : null}
              options={workNoOptions}
              loading={workNoLoading}
              allowClear
              labelInValue
              optionLabelProp="name"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row>
        <Col span={24} style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <Form.Item name="keyword" style={{ marginBottom: 0, width: '300px' }}>
            <Search
              placeholder="输入关键字搜索"
              allowClear
              enterButton="搜索"
              onSearch={onSearch}
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default TicketFilterForm;
