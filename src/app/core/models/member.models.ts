export interface Member {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  join_date?: string;
  status: 'active' | 'inactive';
  notes?: string;
  created_at?: string;
}
