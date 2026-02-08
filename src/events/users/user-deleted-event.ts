import { UserRole } from '../../auth/guards/roles.guard';

export interface UserDeletedEvent {
  userId: string;
  userRole: UserRole;
}
