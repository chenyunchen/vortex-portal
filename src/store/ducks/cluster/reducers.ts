import { ActionType, getType } from 'typesafe-actions';
import { last, transform } from 'lodash';
import * as Cluster from './actions';
import * as Node from '@/models/Node';
import * as Pod from '@/models/Pod';
import * as Service from '@/models/Service';
import * as Container from '@/models/Container';
import * as Namespace from '@/models/Namespace';
import * as Deployment from '@/models/Deployment';
import * as Configmap from '@/models/Configmap';

export interface ClusterStateType {
  nodes: Node.Nodes;
  nodesNics: Node.NodesNics;
  pods: Pod.Pods;
  podsNics: Pod.PodsNics;
  podsFromMongo: Array<Pod.PodFromMongo>;
  containers: Container.Containers;
  deployments: Deployment.Controllers;
  deploymentsFromMongo: Array<Deployment.Deployment>;
  services: Array<Service.Service>;
  namespaces: Array<Namespace.Namespace>;
  configmaps: Array<Configmap.Configmap>;
  allNodes: Array<string>;
  allPods: Array<string>;
  allContainers: Array<string>;
  allDeployments: Array<string>;
  isLoading: boolean;
  error: any;
}

export type ClusterActionType = ActionType<typeof Cluster>;

const initialState: ClusterStateType = {
  nodes: {},
  nodesNics: {},
  pods: {},
  podsNics: {},
  podsFromMongo: [],
  containers: {},
  deployments: {},
  deploymentsFromMongo: [],
  services: [],
  namespaces: [],
  configmaps: [],
  allNodes: [],
  allPods: [],
  allContainers: [],
  allDeployments: [],
  isLoading: false,
  error: null
};

export function clusterReducer(
  state = initialState,
  action: ClusterActionType
) {
  if (state === undefined) {
    return initialState;
  }

  switch (action.type) {
    case getType(Cluster.fetchNodes.request):
    case getType(Cluster.fetchPods.request):
    case getType(Cluster.fetchPod.request):
    case getType(Cluster.fetchPodsFromMongo.request):
    case getType(Cluster.removePod.request):
    case getType(Cluster.removePodByName.request):
    case getType(Cluster.fetchContainer.request):
    case getType(Cluster.fetchServices.request):
    case getType(Cluster.fetchNamespaces.request):
    case getType(Cluster.fetchConfigmaps.request):
    case getType(Cluster.addPod.request):
    case getType(Cluster.addService.request):
    case getType(Cluster.addNamespace.request):
    case getType(Cluster.addConfigmap.request):
    case getType(Cluster.removeService.request):
    case getType(Cluster.removeNamespace.request):
    case getType(Cluster.removeConfigmap.request):
    case getType(Cluster.autoscale.request):
      return { ...state, isLoading: true, error: null };
    case getType(Cluster.fetchNodes.success):
      const nodes = action.payload;
      const allNodes = Object.keys(action.payload);
      const nodesNics = state.nodesNics;

      allNodes.map(key => {
        const nics = nodes[key].nics;
        Object.keys(nics).map(name => {
          // Remove virtual interface
          if (nics[name].type !== 'physical') {
            delete nics[name];
          } else {
            // Add nics data or creating nics data for chart to draw
            if (
              nodesNics.hasOwnProperty(key) &&
              nodesNics[key].hasOwnProperty(name)
            ) {
              const newNetworkTraffic = nics[name].nicNetworkTraffic;
              const originNetworkTraffic =
                nodesNics[key][name].nicNetworkTraffic;

              const receiveBytesTotal = last(
                originNetworkTraffic.receiveBytesTotal
              );
              newNetworkTraffic.receiveBytesTotal.map(data => {
                if (
                  receiveBytesTotal &&
                  data.timestamp > receiveBytesTotal.timestamp
                ) {
                  originNetworkTraffic.receiveBytesTotal.push(data);
                  if (originNetworkTraffic.receiveBytesTotal.length > 15) {
                    originNetworkTraffic.receiveBytesTotal.shift();
                  }
                }
              });

              const transmitBytesTotal = last(
                originNetworkTraffic.transmitBytesTotal
              );
              newNetworkTraffic.transmitBytesTotal.map(data => {
                if (
                  transmitBytesTotal &&
                  data.timestamp > transmitBytesTotal.timestamp
                ) {
                  originNetworkTraffic.transmitBytesTotal.push(data);
                  if (originNetworkTraffic.transmitBytesTotal.length > 15) {
                    originNetworkTraffic.transmitBytesTotal.shift();
                  }
                }
              });

              const receivePacketsTotal = last(
                originNetworkTraffic.receivePacketsTotal
              );
              newNetworkTraffic.receivePacketsTotal.map(data => {
                if (
                  receivePacketsTotal &&
                  data.timestamp > receivePacketsTotal.timestamp
                ) {
                  originNetworkTraffic.receivePacketsTotal.push(data);
                  if (originNetworkTraffic.receivePacketsTotal.length > 15) {
                    originNetworkTraffic.receivePacketsTotal.shift();
                  }
                }
              });

              const transmitPacketsTotal = last(
                originNetworkTraffic.transmitPacketsTotal
              );
              newNetworkTraffic.transmitPacketsTotal.map(data => {
                if (
                  transmitPacketsTotal &&
                  data.timestamp > transmitPacketsTotal.timestamp
                ) {
                  originNetworkTraffic.transmitPacketsTotal.push(data);
                  if (originNetworkTraffic.transmitPacketsTotal.length > 15) {
                    originNetworkTraffic.transmitPacketsTotal.shift();
                  }
                }
              });
            } else {
              if (nodesNics.hasOwnProperty(key)) {
                nodesNics[key][name] = nics[name];
              } else {
                nodesNics[key] = {};
                nodesNics[key][name] = nics[name];
              }
            }
          }
        });
      });
      return {
        ...state,
        nodes,
        allNodes,
        nodesNics,
        isLoading: false
      };
    case getType(Cluster.fetchPods.success):
      const pods = action.payload;
      const allPods = Object.keys(action.payload);
      const podsNics = transform(
        pods,
        (result, pod, podName) => {
          result[podName] = pod.nics;
        },
        state.podsNics
      );

      return {
        ...state,
        pods,
        allPods,
        podsNics,
        isLoading: false
      };
    case getType(Cluster.fetchPod.success):
      return {
        ...state,
        allPods: [...state.allPods, action.payload.podName],
        pods: {
          ...state.pods,
          [action.payload.podName]: action.payload
        },
        podsNics: {
          ...state.podsNics,
          [action.payload.podName]: action.payload.nics
        },
        isLoading: false
      };
    case getType(Cluster.fetchPodsFromMongo.success):
      return {
        ...state,
        podsFromMongo: action.payload,
        isLoading: false
      };
    case getType(Cluster.fetchContainer.success):
      return {
        ...state,
        containers: {
          ...state.containers,
          [action.payload.detail.containerName]: action.payload
        },
        isLoading: false
      };
    case getType(Cluster.addPod.success):
      return {
        ...state,
        isLoading: false
      };
    case getType(Cluster.removePod.success):
      return {
        ...state,
        isLoading: false,
        podsFromMongo: state.podsFromMongo.filter(
          record => record.id !== action.payload.id
        )
      };
    case getType(Cluster.removePodByName.success):
      return {
        ...state,
        isLoading: false
      };
    case getType(Cluster.fetchServices.success):
      return {
        ...state,
        services: action.payload,
        isLoading: false
      };
    case getType(Cluster.addService.success):
      return {
        ...state,
        isLoading: false,
        services: [...state.services, action.payload]
      };
    case getType(Cluster.removeService.success):
      return {
        ...state,
        isLoading: false,
        services: state.services.filter(
          record => record.id !== action.payload.id
        )
      };
    case getType(Cluster.fetchNamespaces.success):
      return {
        ...state,
        namespaces: action.payload,
        isLoading: false
      };
    case getType(Cluster.addNamespace.success):
      return {
        ...state,
        isLoading: false,
        namespaces: [...state.namespaces, action.payload]
      };
    case getType(Cluster.addConfigmap.success):
      return {
        ...state,
        isLoading: false,
        configmaps: [...state.configmaps, action.payload]
      };
    case getType(Cluster.removeNamespace.success):
      return {
        ...state,
        isLoading: false,
        namespaces: state.namespaces.filter(
          record => record.id !== action.payload.id
        )
      };
    case getType(Cluster.removeConfigmap.success):
      return {
        ...state,
        isLoading: false,
        configmaps: state.configmaps.filter(
          record => record.id !== action.payload.id
        )
      };
    case getType(Cluster.fetchDeploymentsFromMongo.success):
      return {
        ...state,
        deploymentsFromMongo: action.payload,
        isLoading: false
      };
    case getType(Cluster.fetchDeployments.success):
      return {
        ...state,
        deployments: action.payload,
        allDeployments: Object.keys(action.payload),
        isLoading: false
      };
    case getType(Cluster.addDeployment.success):
      return {
        ...state,
        isLoading: false
      };
    case getType(Cluster.removeDeployment.success):
      return {
        ...state,
        isLoading: false,
        deploymentsFromMongo: state.deploymentsFromMongo.filter(
          record => record.id !== action.payload.id
        )
      };
    case getType(Cluster.autoscale.success):
      return {
        ...state,
        isLoading: false
      };
    case getType(Cluster.fetchConfigmaps.success):
      return {
        ...state,
        configmaps: action.payload,
        isLoading: false
      };
    case getType(Cluster.fetchNodes.failure):
    case getType(Cluster.fetchPods.failure):
    case getType(Cluster.fetchPod.failure):
    case getType(Cluster.fetchPodsFromMongo.failure):
    case getType(Cluster.fetchConfigmaps.failure):
    case getType(Cluster.removePod.failure):
    case getType(Cluster.removePodByName.failure):
    case getType(Cluster.fetchContainer.failure):
    case getType(Cluster.fetchServices.failure):
    case getType(Cluster.fetchNamespaces.failure):
    case getType(Cluster.addPod.failure):
    case getType(Cluster.addService.failure):
    case getType(Cluster.addNamespace.failure):
    case getType(Cluster.addConfigmap.failure):
    case getType(Cluster.removeService.failure):
    case getType(Cluster.removeNamespace.failure):
    case getType(Cluster.removeConfigmap.failure):
    case getType(Cluster.autoscale.failure):
      return {
        ...state,
        error: action.payload
      };
    case getType(Cluster.clearClusterError):
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
}
