import { useEffect, useState } from 'react';
import { RoleTemplate, Staff } from '../types';
import { LoadedDeploymentReadiness, loadDeploymentReadinessMatrix } from './deploymentReadinessRepository';

export const useDeploymentReadiness = (staff: Staff[], templates: RoleTemplate[]) => {
  const [readiness, setReadiness] = useState<Record<string, LoadedDeploymentReadiness>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!staff.length) {
      setReadiness({});
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    setError('');
    loadDeploymentReadinessMatrix(staff, templates)
      .then(result => { if (active) setReadiness(result); })
      .catch(reason => { if (active) setError(reason?.message || 'Deployment readiness could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [staff, templates]);

  return { readiness, loading, error };
};

