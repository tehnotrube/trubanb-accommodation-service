import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Accommodation } from './accommodation.entity';

export enum PeriodType {
  SEASONAL = 'SEASONAL',
  WEEKEND = 'WEEKEND',
  HOLIDAY = 'HOLIDAY',
  CUSTOM = 'CUSTOM',
}

@Entity('accommodation_rules')
export class AccommodationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => Accommodation,
    (accommodation) => accommodation.accommodationRules,
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

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  overridePrice: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  multiplier: number;

  @Column({ nullable: true })
  periodType: PeriodType;
}
