import * as React from 'react';
import * as DeploymentModel from '@/models/Deployment';
import * as ContainerModel from '@/models/Container';
import * as NamespaceModel from '@/models/Namespace';
import * as ConfigmapModel from '@/models/Configmap';
import { networkModels, networkOperations } from '@/store/ducks/network';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { Card, Upload, Icon, notification } from 'antd';
import { injectIntl, InjectedIntlProps, FormattedMessage } from 'react-intl';
import { InjectedAuthRouterProps } from 'redux-auth-wrapper/history4/redirect';

import { RootState, RTDispatch } from '@/store/ducks';
import { clusterOperations, clusterActions } from '@/store/ducks/cluster';
import { volumeOperations } from '@/store/ducks/volume';
import { Volume as VolumeModel } from '@/models/Storage';

import * as styles from './styles.module.scss';

import DeploymentForm from '@/components/DeploymentForm';
import { loadToken } from '@/utils/auth';

const Dragger = Upload.Dragger;

interface CreateDeploymentState {
  tabKey: string;
}

type CreateDeploymentProps = OwnProps &
  InjectedAuthRouterProps &
  InjectedIntlProps;

interface OwnProps {
  deployments: DeploymentModel.Controllers;
  allDeployments: Array<string>;
  containers: ContainerModel.Containers;
  allContainers: Array<string>;
  networks: Array<networkModels.Network>;
  namespaces: Array<NamespaceModel.Namespace>;
  volumes: Array<VolumeModel>;
  configmaps: Array<ConfigmapModel.Configmap>;
  allNodes: Array<string>;
  fetchDeployments: () => any;
  fetchNetworks: () => any;
  fetchNamespaces: () => any;
  fetchVolumes: () => any;
  fetchConfigmaps: () => any;
  addDeployment: (data: DeploymentModel.Deployment) => any;
  fetchNodes: () => any;
  push: (route: string) => any;
  error: Error | null;
  clearClusterError: () => any;
}

const tabList = [
  {
    key: 'addDeployment',
    tab: <FormattedMessage id="deployment.add" />
  },
  {
    key: 'addDeploymentWithNetwork',
    tab: <FormattedMessage id="deployment.addWithNetwork" />
  },
  {
    key: 'addDeploymentByYAML',
    tab: <FormattedMessage id="deployment.addByYAML" />
  }
];

class CreateDeployment extends React.Component<
  CreateDeploymentProps,
  CreateDeploymentState
> {
  constructor(props: CreateDeploymentProps) {
    super(props);
    this.state = {
      tabKey: 'addDeployment'
    };
  }
  public componentDidMount() {
    this.props.fetchDeployments();
    this.props.fetchNetworks();
    this.props.fetchNamespaces();
    this.props.fetchVolumes();
    this.props.fetchConfigmaps();
    this.props.fetchNodes();
  }

  protected handleUploadChange = (info: any) => {
    const { formatMessage } = this.props.intl;

    if (info.file.status === 'done') {
      this.props.push('/application/deployment');
      notification.success({
        message: formatMessage({
          id: 'action.success'
        }),
        description: formatMessage({
          id: 'deployment.hint.create.success'
        })
      });
    } else if (info.file.status === 'error') {
      notification.error({
        message: formatMessage({
          id: 'action.failure'
        }),
        description:
          formatMessage({
            id: 'deployment.hint.create.failure'
          }) +
          ' (' +
          this.props.error +
          ')'
      });
    }
  };

  protected handleSubmit = (deployment: DeploymentModel.Deployment) => {
    this.props.clearClusterError();
    this.props.addDeployment(deployment);
    this.props.push('/application/deployment');

    const { formatMessage } = this.props.intl;

    if (!this.props.error) {
      notification.success({
        message: formatMessage({
          id: 'action.success'
        }),
        description: formatMessage({
          id: 'deployment.hint.create.success'
        })
      });
    } else {
      notification.error({
        message: formatMessage({
          id: 'action.failure'
        }),
        description:
          formatMessage({
            id: 'deployment.hint.create.failure'
          }) +
          ' (' +
          this.props.error.message +
          ')'
      });
    }
  };

  public renderTabContent = () => {
    const { tabKey } = this.state;

    switch (tabKey) {
      case 'addDeployment':
        return (
          <DeploymentForm
            key={tabKey}
            deployments={this.props.deployments}
            allDeployments={this.props.allDeployments}
            containers={this.props.containers}
            allContainers={this.props.allContainers}
            network={false}
            networks={this.props.networks}
            namespaces={this.props.namespaces}
            volumes={this.props.volumes}
            configmaps={this.props.configmaps}
            allNodes={this.props.allNodes}
            onSubmit={this.handleSubmit}
          />
        );
      case 'addDeploymentWithNetwork':
        return (
          <DeploymentForm
            key={tabKey}
            deployments={this.props.deployments}
            allDeployments={this.props.allDeployments}
            containers={this.props.containers}
            allContainers={this.props.allContainers}
            network={true}
            networks={this.props.networks}
            namespaces={this.props.namespaces}
            volumes={this.props.volumes}
            configmaps={this.props.configmaps}
            allNodes={this.props.allNodes}
            onSubmit={this.handleSubmit}
          />
        );
      case 'addDeploymentByYAML':
        return (
          <Dragger
            name="file"
            headers={{
              Authorization: `Bearer ${loadToken()}`
            }}
            multiple={false}
            showUploadList={false}
            action="/v1/deployments/upload/yaml"
            onChange={this.handleUploadChange}
          >
            <p className="ant-upload-drag-icon">
              <Icon type="inbox" />
            </p>
            <p className="ant-upload-text">
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
              Support for a single or bulk upload.
            </p>
          </Dragger>
        );
      default:
        return null;
    }
  };

  public render() {
    const { tabKey } = this.state;

    return (
      <Card
        className={styles.card}
        bodyStyle={{ height: '90%' }}
        tabList={tabList}
        activeTabKey={tabKey}
        onTabChange={key => {
          this.setState({ tabKey: key });
        }}
      >
        {this.renderTabContent()}
      </Card>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    deployments: state.cluster.deployments,
    allDeployments: state.cluster.allDeployments,
    containers: state.cluster.containers,
    allContainers: state.cluster.allContainers,
    namespaces: state.cluster.namespaces,
    networks: state.network.networks,
    allNodes: state.cluster.allNodes,
    volumes: state.volume.volumes,
    configmaps: state.cluster.configmaps,
    error: state.cluster.error
  };
};

const mapDispatchToProps = (dispatch: RTDispatch) => ({
  fetchDeployments: () => dispatch(clusterOperations.fetchDeployments()),
  fetchNetworks: () => dispatch(networkOperations.fetchNetworks()),
  fetchNamespaces: () => dispatch(clusterOperations.fetchNamespaces()),
  fetchVolumes: () => dispatch(volumeOperations.fetchVolumes()),
  fetchConfigmaps: () => dispatch(clusterOperations.fetchConfigmaps()),
  fetchNodes: () => dispatch(clusterOperations.fetchNodes()),
  addDeployment: (data: DeploymentModel.Deployment) => {
    dispatch(clusterOperations.addDeployment(data));
  },
  push: (route: string) => dispatch(push(route)),
  clearClusterError: () => dispatch(clusterActions.clearClusterError())
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(injectIntl(CreateDeployment));
