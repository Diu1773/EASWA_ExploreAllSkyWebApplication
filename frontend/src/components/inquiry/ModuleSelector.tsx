import { explorationModules } from '../../explorationBlocks/configs';
import type { ExplorationModuleConfig } from '../../explorationBlocks/types';
import { ModuleCard } from './ModuleCard';

interface ModuleSelectorProps {
  modules?: ExplorationModuleConfig[];
}

export function ModuleSelector({ modules = explorationModules }: ModuleSelectorProps) {
  return (
    <div className="inquiry-module-selector">
      {modules.map((module, index) => (
        <ModuleCard key={module.id} module={module} revealDelay={index * 90} />
      ))}
    </div>
  );
}
