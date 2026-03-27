export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: "admin" | "staff";
          daily_rate: number;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          role?: "admin" | "staff";
          daily_rate?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: "admin" | "staff";
          daily_rate?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          customer_name: string;
          item_description: string;
          total_amount: number;
          is_paid: boolean;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          customer_name?: string;
          item_description?: string;
          total_amount?: number;
          is_paid?: boolean;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          customer_name?: string;
          item_description?: string;
          total_amount?: number;
          is_paid?: boolean;
          paid_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          description: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          description: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          description?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      eod_reports: {
        Row: {
          id: string;
          business_id: string;
          report_date: string;
          gross_sales: number;
          paid_sales: number;
          total_expenses: number;
          net_cash: number;
          closed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          report_date: string;
          gross_sales?: number;
          paid_sales?: number;
          total_expenses?: number;
          net_cash?: number;
          closed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          report_date?: string;
          gross_sales?: number;
          paid_sales?: number;
          total_expenses?: number;
          net_cash?: number;
          closed_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          business_id: string;
          type: string;
          amount: number;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          type: string;
          amount: number;
          category: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          type?: string;
          amount?: number;
          category?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      mark_sale_paid: {
        Args: {
          p_business_id: string;
          p_sale_id: string;
        };
        Returns: Database["public"]["Tables"]["sales"]["Row"];
      };
      process_end_of_day: {
        Args: {
          p_business_id: string;
        };
        Returns: Database["public"]["Tables"]["eod_reports"]["Row"];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
