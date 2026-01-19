import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Accommodation } from './accommodation.entity';

@Entity('blocked_periods')
export class BlockedPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => Accommodation,
    (accommodation) => accommodation.blockedPeriods,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'accommodationId' })
  accommodation: Accommodation;

  @Column()
  accommodationId: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column() // 'RESERVATION' za automatske, 'MANUAL' za host-ove ad-hoc blokove
  reason: 'RESERVATION' | 'MANUAL';

  @Column({ nullable: true })
  reservationId: string; // Link ka reservation servisu
}
