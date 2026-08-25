export type DeploymentReadinessStatus = 'Ready for Deployment' | 'Deployment Restricted';

export type DeploymentReadinessSource = 'compliance' | 'training' | 'staff';

export interface DeploymentReadinessReason {
  key: string;
  displayName: string;
  reason: string;
  staffMessage: string;
  source: DeploymentReadinessSource;
  expiryDate?: string;
}

export interface DeploymentReadinessResult {
  status: DeploymentReadinessStatus;
  ready: boolean;
  blockers: DeploymentReadinessReason[];
  warnings: DeploymentReadinessReason[];
  managerClearanceRecorded: boolean;
}

