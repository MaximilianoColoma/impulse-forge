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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      actor_credentials: {
        Row: {
          actor_id: string
          created_at: string
          expires_at: string | null
          hashed_secret: string
          id: string
          label: string | null
          last_used_at: string | null
          prefix: string
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          actor_id: string
          created_at?: string
          expires_at?: string | null
          hashed_secret: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          prefix: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          actor_id?: string
          created_at?: string
          expires_at?: string | null
          hashed_secret?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          prefix?: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "actor_credentials_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      actors: {
        Row: {
          created_at: string
          display_name: string
          id: string
          kind: Database["public"]["Enums"]["actor_kind"]
          metadata: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          kind?: Database["public"]["Enums"]["actor_kind"]
          metadata?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["actor_kind"]
          metadata?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_metric_outbox: {
        Row: {
          attempts: number
          bucket_end: string
          bucket_start: string
          dead_lettered_at: string | null
          delivered_at: string | null
          environment: string
          error_class: string | null
          lease_until: string | null
          metric_id: string
          metric_name: string
          metric_value: number
          result: string | null
          schema_version: number
          size_bucket: string | null
          source_event_count: number
          status: string
          tier: string | null
        }
        Insert: {
          attempts?: number
          bucket_end: string
          bucket_start: string
          dead_lettered_at?: string | null
          delivered_at?: string | null
          environment?: string
          error_class?: string | null
          lease_until?: string | null
          metric_id?: string
          metric_name: string
          metric_value: number
          result?: string | null
          schema_version?: number
          size_bucket?: string | null
          source_event_count: number
          status?: string
          tier?: string | null
        }
        Update: {
          attempts?: number
          bucket_end?: string
          bucket_start?: string
          dead_lettered_at?: string | null
          delivered_at?: string | null
          environment?: string
          error_class?: string | null
          lease_until?: string | null
          metric_id?: string
          metric_name?: string
          metric_value?: number
          result?: string | null
          schema_version?: number
          size_bucket?: string | null
          source_event_count?: number
          status?: string
          tier?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          input_hash: string | null
          metadata: Json
          resource_id: string | null
          resource_type: string
          space_id: string | null
          team_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          input_hash?: string | null
          metadata?: Json
          resource_id?: string | null
          resource_type: string
          space_id?: string | null
          team_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          input_hash?: string | null
          metadata?: Json
          resource_id?: string | null
          resource_type?: string
          space_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_seat_usage"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "audit_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprint_feedback: {
        Row: {
          created_at: string
          feedback_data: Json | null
          feedback_type: string
          id: string
          space_id: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_data?: Json | null
          feedback_type: string
          id?: string
          space_id?: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_data?: Json | null
          feedback_type?: string
          id?: string
          space_id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_feedback_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_feedback_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "community_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      community_templates: {
        Row: {
          anonymized_name: string
          created_at: string
          creator_id: string | null
          description: string | null
          downloads_count: number
          evolution_data: Json | null
          id: string
          is_evolution: boolean
          likes_count: number
          original_name: string
          parent_template_id: string | null
          space_id: string | null
          template_data: Json
          updated_at: string
        }
        Insert: {
          anonymized_name: string
          created_at?: string
          creator_id?: string | null
          description?: string | null
          downloads_count?: number
          evolution_data?: Json | null
          id?: string
          is_evolution?: boolean
          likes_count?: number
          original_name: string
          parent_template_id?: string | null
          space_id?: string | null
          template_data: Json
          updated_at?: string
        }
        Update: {
          anonymized_name?: string
          created_at?: string
          creator_id?: string | null
          description?: string | null
          downloads_count?: number
          evolution_data?: Json | null
          id?: string
          is_evolution?: boolean
          likes_count?: number
          original_name?: string
          parent_template_id?: string | null
          space_id?: string | null
          template_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "community_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_templates_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_status_options: {
        Row: {
          created_at: string
          id: string
          label: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_status_options: {
        Row: {
          created_at: string
          id: string
          label: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          consent_status: string
          contact_status: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          space_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          consent_status?: string
          contact_status?: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          space_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          consent_status?: string
          contact_status?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      impulse_history: {
        Row: {
          changed_at: string
          id: string
          impulse_id: string
          old_content: string
        }
        Insert: {
          changed_at?: string
          id?: string
          impulse_id: string
          old_content: string
        }
        Update: {
          changed_at?: string
          id?: string
          impulse_id?: string
          old_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "impulse_history_impulse_id_fkey"
            columns: ["impulse_id"]
            isOneToOne: false
            referencedRelation: "impulses"
            referencedColumns: ["id"]
          },
        ]
      }
      impulses: {
        Row: {
          attachments: Json | null
          contact_id: string | null
          content: string
          created_at: string
          due_date: string | null
          id: string
          is_archived: boolean
          is_focus_block: boolean
          project_id: string | null
          space_id: string
          status: string
          tags: string[] | null
          tool: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          contact_id?: string | null
          content: string
          created_at?: string
          due_date?: string | null
          id?: string
          is_archived?: boolean
          is_focus_block?: boolean
          project_id?: string | null
          space_id?: string
          status?: string
          tags?: string[] | null
          tool?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          contact_id?: string | null
          content?: string
          created_at?: string
          due_date?: string | null
          id?: string
          is_archived?: boolean
          is_focus_block?: boolean
          project_id?: string | null
          space_id?: string
          status?: string
          tags?: string[] | null
          tool?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impulses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impulses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impulses_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impulses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_confirm_dedup: {
        Row: {
          created_at: string
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      operational_event_outbox: {
        Row: {
          actor_ref: string | null
          attempts: number
          environment: string
          error_class: string | null
          event_id: string
          event_name: string
          expires_at: string
          lease_until: string | null
          occurred_at: string
          processed_at: string | null
          result: string
          schema_version: number
          space_ref: string | null
          status: string
          surface: string | null
          team_ref: string | null
          team_size_bucket: string | null
          tier: string | null
        }
        Insert: {
          actor_ref?: string | null
          attempts?: number
          environment?: string
          error_class?: string | null
          event_id?: string
          event_name: string
          expires_at: string
          lease_until?: string | null
          occurred_at?: string
          processed_at?: string | null
          result: string
          schema_version?: number
          space_ref?: string | null
          status?: string
          surface?: string | null
          team_ref?: string | null
          team_size_bucket?: string | null
          tier?: string | null
        }
        Update: {
          actor_ref?: string | null
          attempts?: number
          environment?: string
          error_class?: string | null
          event_id?: string
          event_name?: string
          expires_at?: string
          lease_until?: string | null
          occurred_at?: string
          processed_at?: string | null
          result?: string
          schema_version?: number
          space_ref?: string | null
          status?: string
          surface?: string | null
          team_ref?: string | null
          team_size_bucket?: string | null
          tier?: string | null
        }
        Relationships: []
      }
      operational_event_retention: {
        Row: {
          category: string
          event_name: string
          retention_interval: string
          updated_at: string
        }
        Insert: {
          category: string
          event_name: string
          retention_interval: string
          updated_at?: string
        }
        Update: {
          category?: string
          event_name?: string
          retention_interval?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_unlocked: boolean
          compact_mode: boolean | null
          created_at: string
          email: string
          first_active_at: string | null
          high_contrast: boolean
          id: string
          low_motion: boolean | null
          onboarding_completed: boolean | null
          onboarding_data: Json | null
          pending_seats: number | null
          pending_seats_effective_at: string | null
          seats: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_period: string | null
          subscription_status: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          synapse_score: number
          theme: string | null
          ui_preferences: Json | null
          updated_at: string
        }
        Insert: {
          ai_unlocked?: boolean
          compact_mode?: boolean | null
          created_at?: string
          email: string
          first_active_at?: string | null
          high_contrast?: boolean
          id: string
          low_motion?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_data?: Json | null
          pending_seats?: number | null
          pending_seats_effective_at?: string | null
          seats?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_period?: string | null
          subscription_status?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          synapse_score?: number
          theme?: string | null
          ui_preferences?: Json | null
          updated_at?: string
        }
        Update: {
          ai_unlocked?: boolean
          compact_mode?: boolean | null
          created_at?: string
          email?: string
          first_active_at?: string | null
          high_contrast?: boolean
          id?: string
          low_motion?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_data?: Json | null
          pending_seats?: number | null
          pending_seats_effective_at?: string | null
          seats?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_period?: string | null
          subscription_status?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          synapse_score?: number
          theme?: string | null
          ui_preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          name: string
          parent_project_id: string | null
          space_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          parent_project_id?: string | null
          space_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          parent_project_id?: string | null
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      space_access: {
        Row: {
          actor_id: string
          granted_at: string
          permission: Database["public"]["Enums"]["space_permission"]
          space_id: string
        }
        Insert: {
          actor_id: string
          granted_at?: string
          permission?: Database["public"]["Enums"]["space_permission"]
          space_id: string
        }
        Update: {
          actor_id?: string
          granted_at?: string
          permission?: Database["public"]["Enums"]["space_permission"]
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_access_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_access_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          id: string
          is_personal: boolean
          name: string
          owner_actor_id: string
          team_id: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["space_visibility"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_personal?: boolean
          name: string
          owner_actor_id: string
          team_id?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["space_visibility"]
        }
        Update: {
          created_at?: string
          id?: string
          is_personal?: boolean
          name?: string
          owner_actor_id?: string
          team_id?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["space_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "spaces_owner_actor_id_fkey"
            columns: ["owner_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_seat_usage"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "spaces_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      structure_snapshots: {
        Row: {
          created_at: string
          description: string | null
          id: string
          snapshot_data: Json
          space_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          snapshot_data: Json
          space_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          snapshot_data?: Json
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "structure_snapshots_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      structure_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          space_id: string
          template_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          space_id?: string
          template_data: Json
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          space_id?: string
          template_data?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "structure_templates_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          actor_id: string
          invited_at: string
          joined_at: string | null
          role: Database["public"]["Enums"]["team_role"]
          seat_assigned_at: string | null
          seat_status: Database["public"]["Enums"]["seat_status"]
          team_id: string
        }
        Insert: {
          actor_id: string
          invited_at?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          seat_assigned_at?: string | null
          seat_status?: Database["public"]["Enums"]["seat_status"]
          team_id: string
        }
        Update: {
          actor_id?: string
          invited_at?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          seat_assigned_at?: string | null
          seat_status?: Database["public"]["Enums"]["seat_status"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_seat_usage"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_actor_id: string
          plan: string
          referral_source: string | null
          seat_limit: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_actor_id: string
          plan?: string
          referral_source?: string | null
          seat_limit?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_actor_id?: string
          plan?: string
          referral_source?: string | null
          seat_limit?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_actor_id_fkey"
            columns: ["owner_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      unassigned_rows: {
        Row: {
          created_at: string
          id: string
          payload: Json
          reason: string
          source_id: string
          source_table: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          reason: string
          source_id: string
          source_table: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          reason?: string
          source_id?: string
          source_table?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_template_likes: {
        Row: {
          created_at: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_template_likes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "community_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tools: {
        Row: {
          created_at: string
          id: string
          space_id: string
          tool_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          space_id?: string
          tool_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          space_id?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tools_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_subscribers: {
        Row: {
          affiliate_interest: boolean | null
          email: string
          id: string
          name: string | null
          source: string | null
          subscribed_at: string | null
        }
        Insert: {
          affiliate_interest?: boolean | null
          email: string
          id?: string
          name?: string | null
          source?: string | null
          subscribed_at?: string | null
        }
        Update: {
          affiliate_interest?: boolean | null
          email?: string
          id?: string
          name?: string | null
          source?: string | null
          subscribed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      team_seat_usage: {
        Row: {
          owner_tier: Database["public"]["Enums"]["subscription_tier"] | null
          seats_active: number | null
          seats_pending: number | null
          seats_purchased: number | null
          seats_remaining: number | null
          team_id: string | null
          team_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_seat: {
        Args: { _actor_id: string; _team_id: string }
        Returns: undefined
      }
      current_actor_id: { Args: never; Returns: string }
      default_space_id_for_current_actor: { Args: never; Returns: string }
      emit_audit: {
        Args: {
          _action: string
          _metadata?: Json
          _resource_id?: string
          _resource_type: string
          _space_id?: string
          _team_id?: string
        }
        Returns: string
      }
      emit_operational_event: {
        Args: {
          _actor_ref?: string
          _environment?: string
          _error_class?: string
          _event_name: string
          _result: string
          _space_ref?: string
          _surface?: string
          _team_ref?: string
          _team_size_bucket?: string
          _tier?: string
        }
        Returns: string
      }
      ensure_personal_space: { Args: { _actor_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_space_access: {
        Args: {
          _perm?: Database["public"]["Enums"]["space_permission"]
          _space_id: string
        }
        Returns: boolean
      }
      invite_member: {
        Args: {
          _actor_id: string
          _role?: Database["public"]["Enums"]["team_role"]
          _team_id: string
        }
        Returns: string
      }
      is_team_member: {
        Args: {
          _min_role?: Database["public"]["Enums"]["team_role"]
          _team_id: string
        }
        Returns: boolean
      }
      revoke_seat: {
        Args: { _actor_id: string; _team_id: string }
        Returns: undefined
      }
      sweep_operational_event_outbox: { Args: never; Returns: number }
      team_owner_profile: {
        Args: { _team_id: string }
        Returns: {
          owner_user_id: string
          seats: number
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
        }[]
      }
    }
    Enums: {
      actor_kind: "human" | "llm" | "service"
      app_role: "admin" | "moderator" | "user"
      seat_status: "active" | "pending" | "revoked"
      space_permission: "read" | "write" | "admin"
      space_visibility: "private" | "team" | "public"
      subscription_tier: "free" | "pro" | "power" | "enterprise"
      team_role: "owner" | "admin" | "member" | "viewer"
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
      actor_kind: ["human", "llm", "service"],
      app_role: ["admin", "moderator", "user"],
      seat_status: ["active", "pending", "revoked"],
      space_permission: ["read", "write", "admin"],
      space_visibility: ["private", "team", "public"],
      subscription_tier: ["free", "pro", "power", "enterprise"],
      team_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
