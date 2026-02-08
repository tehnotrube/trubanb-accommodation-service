import { UserRole } from 'src/auth/guards/roles.guard';

export interface UserDeletedEvent {
  userId: string;
  userRole: UserRole;
}
