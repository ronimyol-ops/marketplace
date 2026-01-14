export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_images: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          image_url: string
          sort_order: number | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_images_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_posting_limits: {
        Row: {
          category_id: string | null
          cooldown_minutes: number
          created_at: string
          id: string
          max_free_ads_per_month: number
          requires_approval: boolean
          requires_payment: boolean
        }
        Insert: {
          category_id?: string | null
          cooldown_minutes?: number
          created_at?: string
          id?: string
          max_free_ads_per_month?: number
          requires_approval?: boolean
          requires_payment?: boolean
        }
        Update: {
          category_id?: string | null
          cooldown_minutes?: number
          created_at?: string
          id?: string
          max_free_ads_per_month?: number
          requires_approval?: boolean
          requires_payment?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ad_posting_limits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          area: string | null
          category_id: string
          condition: Database["public"]["Enums"]["item_condition"]
          created_at: string
          custom_fields: Json | null
          description: string | null
          district: string
          division: string
          expires_at: string | null
          id: string
          is_featured: boolean | null
          price: number | null
          price_type: Database["public"]["Enums"]["price_type"]
          promotion_expires_at: string | null
          promotion_type: string | null
          rejection_message: string | null
          renewed_at: string | null
          slug: string
          status: Database["public"]["Enums"]["ad_status"]
          subcategory_id: string | null
          title: string
          upazila: string | null
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          area?: string | null
          category_id: string
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          district: string
          division: string
          expires_at?: string | null
          id?: string
          is_featured?: boolean | null
          price?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          promotion_expires_at?: string | null
          promotion_type?: string | null
          rejection_message?: string | null
          renewed_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["ad_status"]
          subcategory_id?: string | null
          title: string
          upazila?: string | null
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          area?: string | null
          category_id?: string
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          district?: string
          division?: string
          expires_at?: string | null
          id?: string
          is_featured?: boolean | null
          price?: number | null
          price_type?: Database["public"]["Enums"]["price_type"]
          promotion_expires_at?: string | null
          promotion_type?: string | null
          rejection_message?: string | null
          renewed_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["ad_status"]
          subcategory_id?: string | null
          title?: string
          upazila?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      category_fields: {
        Row: {
          category_id: string | null
          created_at: string
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_required: boolean | null
          options: Json | null
          sort_order: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          field_label: string
          field_name: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          sort_order?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "category_fields_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ad_id: string | null
          buyer_blocked: boolean | null
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string | null
          seller_blocked: boolean | null
          seller_id: string
        }
        Insert: {
          ad_id?: string | null
          buyer_blocked?: boolean | null
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          seller_blocked?: boolean | null
          seller_id: string
        }
        Update: {
          ad_id?: string | null
          buyer_blocked?: boolean | null
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          seller_blocked?: boolean | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ad_id: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          ad_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          ad_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area: string | null
          avatar_url: string | null
          created_at: string
          district: string | null
          division: string | null
          email: string | null
          full_name: string | null
          id: string
          is_blocked: boolean | null
          phone_number: string | null
          phone_verified: boolean | null
          phone_verified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          district?: string | null
          division?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          district?: string | null
          division?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          phone_number?: string | null
          phone_verified?: boolean | null
          phone_verified_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          is_resolved: boolean | null
          reason: string
          user_id: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          reason: string
          user_id: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alerts_enabled: boolean
          category_id: string | null
          condition: string | null
          created_at: string
          district: string | null
          division: string | null
          id: string
          last_checked_at: string | null
          max_price: number | null
          min_price: number | null
          name: string
          new_results_count: number | null
          search_query: string | null
          subcategory_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alerts_enabled?: boolean
          category_id?: string | null
          condition?: string | null
          created_at?: string
          district?: string | null
          division?: string | null
          id?: string
          last_checked_at?: string | null
          max_price?: number | null
          min_price?: number | null
          name: string
          new_results_count?: number | null
          search_query?: string | null
          subcategory_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alerts_enabled?: boolean
          category_id?: string | null
          condition?: string | null
          created_at?: string
          district?: string | null
          division?: string | null
          id?: string
          last_checked_at?: string | null
          max_price?: number | null
          min_price?: number | null
          name?: string
          new_results_count?: number | null
          search_query?: string | null
          subcategory_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_searches_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ad_counts: {
        Row: {
          ad_count: number
          category_id: string | null
          created_at: string
          id: string
          last_posted_at: string | null
          month_year: string
          user_id: string
        }
        Insert: {
          ad_count?: number
          category_id?: string | null
          created_at?: string
          id?: string
          last_posted_at?: string | null
          month_year: string
          user_id: string
        }
        Update: {
          ad_count?: number
          category_id?: string | null
          created_at?: string
          id?: string
          last_posted_at?: string | null
          month_year?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ad_counts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }

      user_permissions: {
        Row: {
          created_at: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Insert: {
          created_at?: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Update: {
          created_at?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          user_id?: string
        }
        Relationships: []
      }
      email_items: {
        Row: {
          body_preview: string | null
          created_at: string
          current_state: Database["public"]["Enums"]["email_state"]
          id: string
          recipient_email: string | null
          recipient_phone: string | null
          subject: string | null
          template: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          body_preview?: string | null
          created_at?: string
          current_state?: Database["public"]["Enums"]["email_state"]
          id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          subject?: string | null
          template?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          body_preview?: string | null
          created_at?: string
          current_state?: Database["public"]["Enums"]["email_state"]
          id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          subject?: string | null
          template?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_events: {
        Row: {
          actor_id: string | null
          created_at: string
          email_id: string
          event_type: Database["public"]["Enums"]["email_event_type"]
          id: string
          metadata: Json | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          email_id: string
          event_type: Database["public"]["Enums"]["email_event_type"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          email_id?: string
          event_type?: Database["public"]["Enums"]["email_event_type"]
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_items"
            referencedColumns: ["id"]
          },
        ]
      }

    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      ad_status: "pending" | "approved" | "rejected" | "sold"
      app_role: "admin" | "user"
      app_permission:
        | "manage_admins"
        | "manage_users"
        | "review_ads"
        | "search_ads"
        | "search_emails"
        | "manage_categories"
        | "manage_reports"
        | "manage_moderation_settings"
        | "create_ads"
        | "manage_blacklists"
        | "manage_site_users"
        | "review_items"
        | "search_archived_ads"
        | "search_pending_ads"
        | "search_enqueued_ads"
        | "search_published_rejected_ads"
        | "set_target_response_time"
        | "edit_ads_outside_review_flow"
        | "manage_shops"
        | "search_site_users"
        | "manage_doorstep_delivery_orders"
        | "view_transactions"
        | "manage_skin_banners"
        | "manage_listing_fee_paid_button"
        | "view_ads_outside_review_flow"
        | "manage_memberships"
        | "manage_skip_manual_ad_review"
        | "manage_deal_of_the_day_dsd"
        | "manage_featured_shop_dsd"
        | "reindex_account_ads"
      email_event_type: "created" | "approved" | "rejected" | "sent"
      email_state: "approved" | "enqueued" | "rejected"
      item_condition: "new" | "used"
      price_type: "fixed" | "negotiable" | "free"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ad_status: ["pending", "approved", "rejected", "sold"],
      app_role: ["admin", "user"],
      item_condition: ["new", "used"],
      price_type: ["fixed", "negotiable", "free"],
    },
  },
} as const
