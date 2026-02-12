import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Controller, Logger } from '@nestjs/common';
import type { UserDeletedEvent } from './user-deleted-event';
import { AccommodationsService } from '../../accommodations/accommodations.service';
import { UserRole } from '../../auth/guards/roles.guard';

@Controller()
export class UserEventsController {
  private readonly logger = new Logger(UserEventsController.name);

  constructor(private readonly accommodationService: AccommodationsService) {}

  @RabbitSubscribe({
    exchange: 'user.events',
    routingKey: 'user.deleted',
    queue: 'accommodations.user-deleted',
    createQueueIfNotExists: true,
  })
  async handleUserDeleted(event: UserDeletedEvent) {
    const { userId } = event;

    this.logger.log(
      `Received user.deleted event → cleaning up for userId=${userId}`,
    );

    try {
      if (event.userRole && event.userRole !== UserRole.HOST) {
        this.logger.debug(
          `User ${userId} is not a host → no accommodations to delete`,
        );
        return;
      }

      const deletedCount =
        await this.accommodationService.removeAllByHostId(userId);

      this.logger.log(
        `Successfully deleted ${deletedCount} accommodations for deleted user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cleanup accommodations for deleted user ${userId}`,
        error || error,
      );
      throw error;
    }
  }
}
