export interface ChurchEvent {
  id?: number;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  type: 'service' | 'prayer' | 'youth' | 'special' | 'other';
  created_at?: string;
}
