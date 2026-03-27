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
      products: {
        Row: {
          id: string;
          business_id: string;
          sku: string;
          name: string;
          retail_price: number;
          stock_level: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          sku: string;
          name: string;
          retail_price: number;
          stock_level?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          sku?: string;
          name?: string;
          retail_price?: number;
          stock_level?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          total_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          total_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          total_amount?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          sale_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_attendance: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          work_date: string;
          wage_due: number;
          is_paid: boolean;
          clocked_in_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          work_date?: string;
          wage_due?: number;
          is_paid?: boolean;
          clocked_in_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          work_date?: string;
          wage_due?: number;
          is_paid?: boolean;
          clocked_in_at?: string;
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
          total_wages_paid: number;
          net_cash: number;
          closed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          report_date: string;
          gross_sales?: number;
          total_wages_paid?: number;
          net_cash?: number;
          closed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          report_date?: string;
          gross_sales?: number;
          total_wages_paid?: number;
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
      create_sale: {
        Args: {
          p_business_id: string;
          p_items: Json;
        };
        Returns: Database["public"]["Tables"]["sales"]["Row"];
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
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
