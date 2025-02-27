import { ROOT_ROLE_TYPE, PROJECT_ROLE_TYPE } from '@server/util/constants';
import { IPermission } from './permissions';

export type PredefinedRoleType =
    | typeof ROOT_ROLE_TYPE
    | typeof PROJECT_ROLE_TYPE;

interface IRole {
    id: number;
    name: string;
    project: string | null;
    description: string;
    type: string;
}

export interface IRoleWithPermissions extends IRole {
    permissions: IPermission[];
}

export interface IProjectRole {
    id: number;
    name: string;
    description: string;
    type: string;
}

export default IRole;
