import * as React from 'react';
import * as PodModel from '@/models/Pod';
import * as NetworkModel from '@/models/Network';
import * as NamespaceModel from '@/models/Namespace';
import { connect } from 'react-redux';
import { Input, Select, Table, Card } from 'antd';
import * as moment from 'moment';
import { ColumnProps } from 'antd/lib/table';
import { includes } from 'lodash';
import { injectIntl, InjectedIntlProps, FormattedMessage } from 'react-intl';
import { InjectedAuthRouterProps } from 'redux-auth-wrapper/history4/redirect';

import { RootState, RTDispatch } from '@/store/ducks';
import { clusterOperations, clusterSelectors } from '@/store/ducks/cluster';

import ItemActions from '@/components/ItemActions';
import withCapitalize from '@/containers/withCapitalize';

const CapitalizedMessage = withCapitalize(FormattedMessage);
const InputGroup = Input.Group;
const Search = Input.Search;
const Option = Select.Option;

interface PodState {
  networks: Array<NetworkModel.Network>;
  namespaces: Array<NamespaceModel.Namespace>;
  searchType: string;
  searchText: string;
}

type PodProps = OwnProps & InjectedAuthRouterProps & InjectedIntlProps;
interface OwnProps {
  pods: PodModel.Pods;
  allPods: Array<string>;
  podsNics: PodModel.PodsNics;
  fetchPods: () => any;
  removePod: (id: string) => any;
  removePodByName: (namespace: string, id: string) => any;
}

class Pod extends React.Component<PodProps, PodState> {
  private intervalPodId: number;
  private columns: Array<ColumnProps<PodModel.PodInfo>> = [
    {
      title: <CapitalizedMessage id="name" />,
      dataIndex: 'name',
      width: 300
    },
    {
      title: <CapitalizedMessage id="namespace" />,
      dataIndex: 'namespace'
    },
    {
      title: <CapitalizedMessage id="node" />,
      dataIndex: 'node'
    },
    {
      title: <CapitalizedMessage id="status" />,
      dataIndex: 'status'
    },
    {
      title: <CapitalizedMessage id="createdAt" />,
      dataIndex: 'createdAt'
    },
    {
      title: <CapitalizedMessage id="action" />,
      render: (_, record) => (
        <ItemActions
          items={[
            {
              type: 'link',
              link: {
                to: {
                  pathname: `/application/pod/${record.name}`
                }
              }
            }
          ]}
        />
      )
    }
  ];
  constructor(props: PodProps) {
    super(props);
    this.state = {
      networks: [],
      namespaces: [],
      searchType: 'pod',
      searchText: ''
    };
  }

  public componentDidMount() {
    this.props.fetchPods();
    this.intervalPodId = window.setInterval(this.props.fetchPods, 5000);
  }

  public componentWillUnmount() {
    clearInterval(this.intervalPodId);
  }

  protected handleChangeSearchType = (type: string) => {
    this.setState({ searchType: type, searchText: '' });
  };

  protected handleSearch = (e: React.FormEvent<HTMLInputElement>) => {
    this.setState({ searchText: e.currentTarget.value });
  };

  protected getPodInfo = (pods: Array<string>) => {
    return pods.map(pod => ({
      name: this.props.pods[pod].podName,
      namespace: this.props.pods[pod].namespace,
      node: this.props.pods[pod].node,
      status: this.props.pods[pod].status,
      restarts: this.props.pods[pod].restartCount,
      createdAt: moment(this.props.pods[pod].createAt * 1000).fromNow()
    }));
  };

  public render() {
    const { searchText } = this.state;
    const filterPods = this.props.allPods.filter(name => {
      switch (this.state.searchType) {
        default:
        case 'pod':
          return includes(this.props.pods[name].podName, searchText);
        case 'container':
          for (const container of this.props.pods[name].containers) {
            if (includes(container, searchText)) {
              return true;
            }
          }
          return false;
        case 'node':
          return includes(this.props.pods[name].node, searchText);
        case 'namespace':
          return includes(this.props.pods[name].namespace, searchText);
      }
    });

    return (
      <div>
        <Card title={<CapitalizedMessage id="pod" />}>
          <div className="table-controls">
            <InputGroup compact={true}>
              <Select
                style={{ width: '15%' }}
                defaultValue="pod"
                onChange={this.handleChangeSearchType}
              >
                <Option value="pod">
                  <CapitalizedMessage id="pod.filter.podName" />
                </Option>
                <Option value="container">
                  <CapitalizedMessage id="pod.filter.containerName" />
                </Option>
                <Option value="node">
                  <CapitalizedMessage id="pod.filter.nodeName" />
                </Option>
                <Option value="namespace">
                  <CapitalizedMessage id="pod.filter.namespaceName" />
                </Option>
              </Select>
              <Search
                style={{ width: '25%' }}
                placeholder={this.props.intl.formatMessage(
                  {
                    id: 'form.placeholder.filter'
                  },
                  {
                    field: this.props.intl.formatMessage({
                      id: 'pod'
                    })
                  }
                )}
                value={this.state.searchText}
                onChange={this.handleSearch}
              />
            </InputGroup>
          </div>
          <Table
            rowKey="name"
            className="main-table"
            columns={this.columns}
            dataSource={this.getPodInfo(filterPods)}
          />
        </Card>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  state.cluster.podsFromMongo.forEach(pod => {
    if (state.cluster.pods[pod.name] !== undefined) {
      state.cluster.pods[pod.name].metadata = pod;
    }
  });
  return {
    pods: clusterSelectors.getPodsInAvailableNamespace(state.cluster),
    allPods: clusterSelectors.getAllPodsInAvailableNamespace(state.cluster),
    podsNics: state.cluster.podsNics
  };
};

const mapDispatchToProps = (dispatch: RTDispatch) => ({
  fetchPods: () => dispatch(clusterOperations.fetchPods()),
  addPod: (data: PodModel.PodRequest) => {
    dispatch(clusterOperations.addPod(data));
  },
  removePodByName: (namespace: string, id: string) =>
    dispatch(clusterOperations.removePodByName(namespace, id))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(injectIntl(Pod));
