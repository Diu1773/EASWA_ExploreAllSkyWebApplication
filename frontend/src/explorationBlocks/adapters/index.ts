import { clusterCmdAdapter } from './clusterCmdAdapter';
import { exoplanetAdapter } from './exoplanetAdapter';
import { kmtnetAdapter } from './kmtnetAdapter';
import type { ExplorationModuleAdapter, ModuleId } from '../types';

export const moduleAdapters: Record<ModuleId, ExplorationModuleAdapter<unknown>> = {
  'exoplanet-transit': exoplanetAdapter as ExplorationModuleAdapter<unknown>,
  'cluster-cmd': clusterCmdAdapter as ExplorationModuleAdapter<unknown>,
  kmtnet: kmtnetAdapter,
};

export { clusterCmdAdapter, exoplanetAdapter, kmtnetAdapter };
