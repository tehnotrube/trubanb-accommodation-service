import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BlockedPeriod } from './blocked-period.entity';
import { AccommodationRule } from './accommodation-rule.entity';

@Entity('accommodations')
export class Accommodation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column('text', { array: true, default: '{}' })
  amenities: string[];

  @Column('text', { array: true, default: '{}' })
  photoKeys: string[];

  photoUrls?: string[];

  @Column({ type: 'int', default: 1 })
  minGuests: number;

  @Column({ type: 'int', default: 1 })
  maxGuests: number;

  @Column()
  hostId: string; // references the host user in user service

  @Column({ type: 'boolean', default: false })
  autoApprove: boolean;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  basePrice: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AccommodationRule, (rule) => rule.accommodation)
  calendarPeriods: AccommodationRule[];

  @OneToMany(() => BlockedPeriod, (block) => block.accommodation)
  blockedPeriods: BlockedPeriod[];
}
