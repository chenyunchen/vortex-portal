import * as React from 'react';
import * as ServiceModel from '@/models/Service';
import * as NamespaceModel from '@/models/Namespace';
import { connect } from 'react-redux';
import { Button, Icon, Tree, Tag, Card, Table, notification } from 'antd';
import { ColumnProps } from 'antd/lib/table';
import * as moment from 'moment';
import { Dispatch } from 'redux';
import { injectIntl, InjectedIntlProps, FormattedMessage } from 'react-intl';
import { InjectedAuthRouterProps } from 'redux-auth-wrapper/history4/redirect';

import { RootState, RootAction, RTDispatch } from '@/store/ducks';
import { clusterOperations, clusterActions } from '@/store/ducks/cluster';
import ServiceForm from '@/components/ServiceForm';
import ItemActions from '@/components/ItemActions';

import * as namespaceAPI from '@/services/namespace';
import withCapitalize from '@/containers/withCapitalize';

const CapitalizedMessage = withCapitalize(FormattedMessage);
const TreeNode = Tree.TreeNode;

interface ServiceState {
  visibleModal: boolean;
  namespaces: Array<NamespaceModel.Namespace>;
}

type ServiceProps = OwnProps & InjectedAuthRouterProps & InjectedIntlProps;
interface OwnProps {
  services: Array<ServiceModel.Service>;
  fetchServices: () => any;
  addService: (data: ServiceModel.Service) => any;
  removeService: (id: string) => any;
  error: Error | null;
  clearClusterError: () => any;
  push: (route: string) => any;
}

class Service extends React.Component<ServiceProps, ServiceState> {
  private columns: Array<ColumnProps<ServiceModel.Service>> = [
    {
      title: <CapitalizedMessage id="name" />,
      dataIndex: 'name'
    },
    {
      title: <CapitalizedMessage id="owner" />,
      dataIndex: 'owner'
    },
    {
      title: <CapitalizedMessage id="namespace" />,
      dataIndex: 'namespace'
    },
    {
      title: <CapitalizedMessage id="service.type" />,
      dataIndex: 'type'
    },
    {
      title: <CapitalizedMessage id="service.selectors" />,
      render: (_, record) => (
        <div>
          {Object.keys(record.selector).map((key: string) => (
            <Tag key={key}>{`${key} : ${record.selector[key]}`}</Tag>
          ))}
        </div>
      )
    },
    {
      title: <CapitalizedMessage id="service.ports" />,
      render: (_, record) => (
        <Tree showIcon={true} selectable={false}>
          {record.ports.map((port: ServiceModel.ServicePort) => (
            <TreeNode
              title={port.name}
              key={port.name}
              icon={<Icon type="tags" />}
            >
              <TreeNode
                icon={<Icon type="tag-o" />}
                title={`Target Port: ${port.targetPort}`}
              />
              <TreeNode
                icon={<Icon type="tag-o" />}
                title={`Port: ${port.port}`}
              />
              {record.type === 'NodePort' && (
                <TreeNode
                  icon={<Icon type="tag-o" />}
                  title={`Node Port: ${port.nodePort}`}
                />
              )}
            </TreeNode>
          ))}
        </Tree>
      )
    },
    {
      title: <CapitalizedMessage id="createdAt" />,
      render: (_, record) => moment(record.createdAt).calendar()
    },
    {
      title: <CapitalizedMessage id="action" />,
      key: 'action',
      render: (_, record) => (
        <ItemActions
          items={[
            {
              type: 'delete',
              onConfirm: this.handleRemoveService.bind(this, record.id)
            }
          ]}
        />
      )
    }
  ];
  constructor(props: ServiceProps) {
    super(props);
    this.state = {
      visibleModal: false,
      namespaces: []
    };
  }

  public componentDidMount() {
    this.props.fetchServices();
  }

  protected showCreate = () => {
    namespaceAPI.getNamespaces().then(res => {
      this.setState({ namespaces: res.data });
    });
    this.setState({ visibleModal: true });
  };

  protected hideCreate = () => {
    this.setState({ visibleModal: false });
  };

  protected handleUploadChange = (info: any) => {
    const { formatMessage } = this.props.intl;
    this.setState({
      visibleModal: false
    });
    if (info.file.status === 'done') {
      notification.success({
        message: formatMessage({
          id: 'action.success'
        }),
        description: formatMessage({
          id: 'service.hint.create.success'
        })
      });
    } else if (info.file.status === 'error') {
      notification.error({
        message: formatMessage({
          id: 'action.failure'
        }),
        description: formatMessage({
          id: 'service.hint.create.failure'
        })
      });
    }
  };

  protected handleSubmit = (service: ServiceModel.Service) => {
    this.props.clearClusterError();
    this.props.addService(service);
    this.setState({ visibleModal: false });

    const { formatMessage } = this.props.intl;

    if (!this.props.error) {
      notification.success({
        message: formatMessage({
          id: 'action.success'
        }),
        description: formatMessage({
          id: 'service.hint.create.success'
        })
      });
    } else {
      notification.error({
        message: formatMessage({
          id: 'action.failure'
        }),
        description:
          formatMessage({
            id: 'service.hint.create.failure'
          }) +
          ' (' +
          this.props.error.message +
          ')'
      });
    }
  };

  protected handleRemoveService = (id: string) => {
    this.props.clearClusterError();
    this.props.removeService(id);

    const { formatMessage } = this.props.intl;

    if (!this.props.error) {
      notification.success({
        message: formatMessage({
          id: 'action.success'
        }),
        description: formatMessage({
          id: 'service.hint.delete.success'
        })
      });
    } else {
      notification.error({
        message: formatMessage({
          id: 'action.failure'
        }),
        description:
          formatMessage({
            id: 'service.hint.delete.failure'
          }) +
          ' (' +
          this.props.error.message +
          ')'
      });
    }
  };

  protected getServiceInfo = (services: Array<ServiceModel.Service>) => {
    return services.map(service => {
      const displayName =
        service.createdBy === undefined
          ? 'none'
          : service.createdBy!.displayName;
      return {
        id: service.id,
        name: service.name,
        owner: displayName,
        type: service.type,
        namespace: service.namespace,
        selector: service.selector,
        ports: service.ports
      };
    });
  };

  public render() {
    const { services } = this.props;
    return (
      <div>
        <Card
          title={<CapitalizedMessage id="service" />}
          extra={
            <Button onClick={this.showCreate}>
              <Icon type="plus" /> <FormattedMessage id="service.add" />
            </Button>
          }
        >
          <Table
            className="main-table"
            columns={this.columns}
            dataSource={this.getServiceInfo(this.props.services)}
          />
          <ServiceForm
            services={services}
            namespaces={this.state.namespaces}
            visible={this.state.visibleModal}
            onCancel={this.hideCreate}
            onSubmit={this.handleSubmit}
            onSubmitYAML={this.handleUploadChange}
          />
        </Card>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    services: state.cluster.services,
    error: state.cluster.error
  };
};

const mapDispatchToProps = (dispatch: RTDispatch & Dispatch<RootAction>) => ({
  fetchServices: () => dispatch(clusterOperations.fetchServices()),
  addService: (data: ServiceModel.Service) => {
    dispatch(clusterOperations.addService(data));
  },
  removeService: (id: string) => dispatch(clusterOperations.removeService(id)),
  clearClusterError: () => dispatch(clusterActions.clearClusterError())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(injectIntl(Service));
