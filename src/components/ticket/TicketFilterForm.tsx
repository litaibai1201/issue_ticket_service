/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Form, Input, Select, Row, Col, Button } from 'antd';
import { WorkNoOption } from './WorkNoSearch';

const { Search } = Input;
const { Option } = Select;

interface TicketFilterFormProps {
   
  form: any; // Form 实例
  onFilter: (values: any) => void;
  onSearch: (keyword: string) => void;
  onReset: () => void; // 新增重置回调
  onFormValuesChange: (changedValues: any, allValues: any) => void;
  handleWorkNoSearch: (value: string) => void;
  workNoOptions: WorkNoOption[];
  workNoLoading: boolean;
  // 动态筛选数据
  locationOptions: {id: string; name: string}[];
  factoryOptions: {id: string; name: string}[];
  buOptions: {id: string; name: string}[];
  stationOptions: {id: string; name: string}[];
}

// 状态选项固定不变


const statuses = [
  { id: '1', name: '待处理' },
  { id: '2', name: '处理中' },
  { id: '3', name: '已完成' },
];

const TicketFilterForm: React.FC<TicketFilterFormProps> = ({
  form,
  onFilter,
  onSearch,
  onReset,
  onFormValuesChange,
  handleWorkNoSearch,
  workNoOptions,
  workNoLoading,
  locationOptions,
  factoryOptions,
  buOptions,
  stationOptions,
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
              {locationOptions && locationOptions.map((loc) => (
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
              {factoryOptions && factoryOptions.map((factory) => (
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
              {buOptions && buOptions.map((bu) => (
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
              {stationOptions && stationOptions.map((station) => (
                <Option key={station.id} value={station.id}>
                  {station.name}
                </Option>
              ))}
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
        <Col span={24} style={{ display: 'flex', alignItems: 'center', marginTop: '16px', position: 'relative' }}>
          {/* 搜索框居中 */}
          <div style={{ width: '300px', margin: '0 auto' }}>
            <Form.Item name="keyword" style={{ marginBottom: 0 }}>
              <Search
                placeholder="输入关键字搜索"
                allowClear
                enterButton="搜索"
                onSearch={onSearch}
              />
            </Form.Item>
          </div>
          
          {/* 重置按钮与搜索框同高度并位于最右边 */}
          <Button 
            type="primary" 
            danger 
            onClick={onReset}
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          >
            重置
          </Button>
        </Col>
      </Row>
    </Form>
  );
};

export default TicketFilterForm;
