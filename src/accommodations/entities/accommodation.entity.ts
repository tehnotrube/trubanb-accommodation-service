import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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

  @Column({ type: 'int', default: 1 })
  minGuests: number;

  @Column({ type: 'int', default: 1 })
  maxGuests: number;

  @Column()
  hostId: string; // references the host user in user service

  @Column({ type: 'boolean', default: false })
  autoApprove: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;
}
