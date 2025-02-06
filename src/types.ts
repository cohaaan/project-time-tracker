export interface TimeEntry {
  id: string;
  companyId: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  isManual: boolean;
  date: string; // YYYY-MM-DD format
  userId: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: string;
}

export interface ActiveTimer {
  companyId: string;
  startTime: string;
}

export interface ManualEntryForm {
  companyId: string;
  startTime: string;
  endTime: string;
  date: string;
}

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          color: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      time_entries: {
        Row: {
          id: string;
          company_id: string;
          start_time: string;
          end_time: string;
          duration: number;
          is_manual: boolean;
          date: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          start_time: string;
          end_time: string;
          duration: number;
          is_manual: boolean;
          date: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          start_time?: string;
          end_time?: string;
          duration?: number;
          is_manual?: boolean;
          date?: string;
          user_id?: string;
          created_at?: string;
        };
      };
    };
  };
}