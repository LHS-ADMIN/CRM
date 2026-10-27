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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      academy_resources: {
        Row: {
          active: boolean
          audience_type: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          resource_type: string
          resource_url: string | null
          sort_order: number
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience_type?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          resource_type?: string
          resource_url?: string | null
          sort_order?: number
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience_type?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          resource_type?: string
          resource_url?: string | null
          sort_order?: number
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_resources_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          active: boolean
          audience_type: string
          body: string
          created_at: string
          created_by: string
          ends_at: string | null
          external_url: string | null
          id: string
          starts_at: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience_type?: string
          body: string
          created_at?: string
          created_by: string
          ends_at?: string | null
          external_url?: string | null
          id?: string
          starts_at?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience_type?: string
          body?: string
          created_at?: string
          created_by?: string
          ends_at?: string | null
          external_url?: string | null
          id?: string
          starts_at?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          public_readable: boolean
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          public_readable?: boolean
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          public_readable?: boolean
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      attachments: {
        Row: {
          bucket_id: string
          created_at: string
          creator_id: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          object_path: string
          parent_id: string
          parent_type: string
          team_id: string | null
          uploaded_by: string
          visibility: string
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          creator_id?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          object_path: string
          parent_id: string
          parent_type: string
          team_id?: string | null
          uploaded_by: string
          visibility?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          creator_id?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          object_path?: string
          parent_id?: string
          parent_type?: string
          team_id?: string | null
          uploaded_by?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          actor_username: string | null
          entity_id: string | null
          entity_type: string
          event_time: string
          id: number
          metadata: Json
          result: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          actor_username?: string | null
          entity_id?: string | null
          entity_type: string
          event_time?: string
          id?: never
          metadata?: Json
          result?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          actor_username?: string | null
          entity_id?: string | null
          entity_type?: string
          event_time?: string
          id?: never
          metadata?: Json
          result?: string
        }
        Relationships: []
      }
      battles: {
        Row: {
          battle_date: string
          battle_sheet_url: string | null
          created_at: string
          creator_handle: string | null
          creator_id: string | null
          diamond_range: string | null
          id: string
          league: string
          lhs_manager: string | null
          notes: string | null
          opponent_agency: string | null
          opponent_name: string | null
          source_confirm: string | null
          source_key: string | null
          source_row: number | null
          source_sheet_name: string | null
          source_spreadsheet_id: string | null
          status: string
          synced_at: string
          team_id: string | null
          team_name: string | null
          time_est: string
          time_sort: string | null
          updated_at: string
        }
        Insert: {
          battle_date: string
          battle_sheet_url?: string | null
          created_at?: string
          creator_handle?: string | null
          creator_id?: string | null
          diamond_range?: string | null
          id?: string
          league: string
          lhs_manager?: string | null
          notes?: string | null
          opponent_agency?: string | null
          opponent_name?: string | null
          source_confirm?: string | null
          source_key?: string | null
          source_row?: number | null
          source_sheet_name?: string | null
          source_spreadsheet_id?: string | null
          status?: string
          synced_at?: string
          team_id?: string | null
          team_name?: string | null
          time_est: string
          time_sort?: string | null
          updated_at?: string
        }
        Update: {
          battle_date?: string
          battle_sheet_url?: string | null
          created_at?: string
          creator_handle?: string | null
          creator_id?: string | null
          diamond_range?: string | null
          id?: string
          league?: string
          lhs_manager?: string | null
          notes?: string | null
          opponent_agency?: string | null
          opponent_name?: string | null
          source_confirm?: string | null
          source_key?: string | null
          source_row?: number | null
          source_sheet_name?: string | null
          source_spreadsheet_id?: string | null
          status?: string
          synced_at?: string
          team_id?: string | null
          team_name?: string | null
          time_est?: string
          time_sort?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "battles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_leaderboard: {
        Row: {
          campaign_id: string
          creator_id: string
          metric_value: string | null
          rank: number | null
          score: number | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          creator_id: string
          metric_value?: string | null
          rank?: number | null
          score?: number | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          creator_id?: string
          metric_value?: string | null
          rank?: number | null
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_leaderboard_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_leaderboard_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_prizes: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          place_label: string | null
          prize_description: string
          sort_order: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          place_label?: string | null
          prize_description: string
          sort_order?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          place_label?: string | null
          prize_description?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_prizes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_targets: {
        Row: {
          campaign_id: string
          created_at: string
          creator_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creator_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_targets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_targets_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          active: boolean
          audience_type: string
          created_at: string
          created_by: string
          custom_metric_name: string | null
          description: string | null
          end_at: string
          id: string
          import_key: string | null
          metric: string | null
          rules: string | null
          source_metadata: Json
          source_type: string
          start_at: string
          status: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience_type?: string
          created_at?: string
          created_by: string
          custom_metric_name?: string | null
          description?: string | null
          end_at: string
          id?: string
          import_key?: string | null
          metric?: string | null
          rules?: string | null
          source_metadata?: Json
          source_type?: string
          start_at: string
          status?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience_type?: string
          created_at?: string
          created_by?: string
          custom_metric_name?: string | null
          description?: string | null
          end_at?: string
          id?: string
          import_key?: string | null
          metric?: string | null
          rules?: string | null
          source_metadata?: Json
          source_type?: string
          start_at?: string
          status?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          active: boolean
          author_user_id: string
          body: string
          channel_type: string
          created_at: string
          hidden_at: string | null
          hidden_by: string | null
          id: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          author_user_id: string
          body: string
          channel_type?: string
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          author_user_id?: string
          body?: string
          channel_type?: string
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_hidden_by_fkey"
            columns: ["hidden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      community_replies: {
        Row: {
          active: boolean
          author_user_id: string
          body: string
          created_at: string
          hidden_at: string | null
          hidden_by: string | null
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          author_user_id: string
          body: string
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          author_user_id?: string
          body?: string
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_replies_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_replies_hidden_by_fkey"
            columns: ["hidden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_directory: {
        Row: {
          active: boolean
          avatar_url: string | null
          bio: string | null
          creator_id: string
          display_name: string
          niche: string | null
          tiktok_handle: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          creator_id: string
          display_name: string
          niche?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          bio?: string | null
          creator_id?: string
          display_name?: string
          niche?: string | null
          tiktok_handle?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_directory_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_notes: {
        Row: {
          active: boolean
          author_user_id: string
          created_at: string
          creator_id: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          note_text: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          author_user_id: string
          created_at?: string
          creator_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          note_text: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          author_user_id?: string
          created_at?: string
          creator_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          note_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_notes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_private_contacts: {
        Row: {
          address: string | null
          created_at: string
          creator_id: string
          email: string | null
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          creator_id: string
          email?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          creator_id?: string
          email?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_private_contacts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          active: boolean
          agency_creator_id: string
          archived_at: string | null
          archived_by: string | null
          auth_user_id: string | null
          backstage_notes: string | null
          bio: string | null
          created_at: string
          creator_name: string
          creator_network_manager: string | null
          display_name: string | null
          graduation_status: string | null
          group_name: string | null
          id: string
          invitation_type: string | null
          invited_by: string | null
          join_date: string | null
          management_relationship_dates: string | null
          niche: string | null
          profile_photo_url: string | null
          promote_permission: string | null
          relationship_status: string | null
          renewed_management_relationship_dates: string | null
          source_import_file_name: string | null
          source_imported_at: string | null
          status: string
          team_id: string | null
          tier: string | null
          tiktok_handle: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          agency_creator_id: string
          archived_at?: string | null
          archived_by?: string | null
          auth_user_id?: string | null
          backstage_notes?: string | null
          bio?: string | null
          created_at?: string
          creator_name: string
          creator_network_manager?: string | null
          display_name?: string | null
          graduation_status?: string | null
          group_name?: string | null
          id?: string
          invitation_type?: string | null
          invited_by?: string | null
          join_date?: string | null
          management_relationship_dates?: string | null
          niche?: string | null
          profile_photo_url?: string | null
          promote_permission?: string | null
          relationship_status?: string | null
          renewed_management_relationship_dates?: string | null
          source_import_file_name?: string | null
          source_imported_at?: string | null
          status?: string
          team_id?: string | null
          tier?: string | null
          tiktok_handle?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          agency_creator_id?: string
          archived_at?: string | null
          archived_by?: string | null
          auth_user_id?: string | null
          backstage_notes?: string | null
          bio?: string | null
          created_at?: string
          creator_name?: string
          creator_network_manager?: string | null
          display_name?: string | null
          graduation_status?: string | null
          group_name?: string | null
          id?: string
          invitation_type?: string | null
          invited_by?: string | null
          join_date?: string | null
          management_relationship_dates?: string | null
          niche?: string | null
          profile_photo_url?: string | null
          promote_permission?: string | null
          relationship_status?: string | null
          renewed_management_relationship_dates?: string | null
          source_import_file_name?: string | null
          source_imported_at?: string | null
          status?: string
          team_id?: string | null
          tier?: string | null
          tiktok_handle?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creators_auth_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creators_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      help_content: {
        Row: {
          active: boolean
          audience_type: string
          body: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          sort_order: number
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience_type?: string
          body: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          sort_order?: number
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience_type?: string
          body?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          sort_order?: number
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_content_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_content_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      import_log: {
        Row: {
          completed_at: string | null
          created_by: string | null
          created_count: number
          id: string
          import_type: string
          matched_count: number
          metadata: Json
          received_count: number
          source_file_id: string | null
          source_file_name: string | null
          started_at: string
          status: string
          unmatched_count: number
          updated_count: number
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          created_count?: number
          id?: string
          import_type: string
          matched_count?: number
          metadata?: Json
          received_count?: number
          source_file_id?: string | null
          source_file_name?: string | null
          started_at?: string
          status?: string
          unmatched_count?: number
          updated_count?: number
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          created_count?: number
          id?: string
          import_type?: string
          matched_count?: number
          metadata?: Json
          received_count?: number
          source_file_id?: string | null
          source_file_name?: string | null
          started_at?: string
          status?: string
          unmatched_count?: number
          updated_count?: number
        }
        Relationships: []
      }
      metrics_current: {
        Row: {
          creator_id: string
          data_period: string | null
          diamonds: number
          diamonds_from_matches: number
          graduation_status: string | null
          import_id: string | null
          imported_at: string
          live_days: number
          live_duration_display: string | null
          live_duration_seconds: number
          live_streams: number
          matches: number
          multi_guest_diamonds: number
          new_followers: number
          rank: string | null
          source_file_id: string | null
          source_file_name: string | null
          source_updated_at: string | null
          team_id: string | null
          team_name: string | null
          tier_status: string | null
          tiktok_handle: string | null
        }
        Insert: {
          creator_id: string
          data_period?: string | null
          diamonds?: number
          diamonds_from_matches?: number
          graduation_status?: string | null
          import_id?: string | null
          imported_at?: string
          live_days?: number
          live_duration_display?: string | null
          live_duration_seconds?: number
          live_streams?: number
          matches?: number
          multi_guest_diamonds?: number
          new_followers?: number
          rank?: string | null
          source_file_id?: string | null
          source_file_name?: string | null
          source_updated_at?: string | null
          team_id?: string | null
          team_name?: string | null
          tier_status?: string | null
          tiktok_handle?: string | null
        }
        Update: {
          creator_id?: string
          data_period?: string | null
          diamonds?: number
          diamonds_from_matches?: number
          graduation_status?: string | null
          import_id?: string | null
          imported_at?: string
          live_days?: number
          live_duration_display?: string | null
          live_duration_seconds?: number
          live_streams?: number
          matches?: number
          multi_guest_diamonds?: number
          new_followers?: number
          rank?: string | null
          source_file_id?: string | null
          source_file_name?: string | null
          source_updated_at?: string | null
          team_id?: string | null
          team_name?: string | null
          tier_status?: string | null
          tiktok_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_current_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_current_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "import_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metrics_current_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          announcement_id: string | null
          body: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          notification_type: string
          read_at: string | null
          source_id: string | null
          source_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          announcement_id?: string | null
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          notification_type?: string
          read_at?: string | null
          source_id?: string | null
          source_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          announcement_id?: string | null
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          notification_type?: string
          read_at?: string | null
          source_id?: string | null
          source_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_details: {
        Row: {
          address: string | null
          bio: string | null
          birthday: string | null
          created_at: string
          email: string | null
          niche: string | null
          phone: string | null
          real_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          bio?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          niche?: string | null
          phone?: string | null
          real_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          bio?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          niche?: string | null
          phone?: string | null
          real_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_directory: {
        Row: {
          active: boolean
          admin_only: boolean
          avatar_url: string | null
          display_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          admin_only?: boolean
          avatar_url?: string | null
          display_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          admin_only?: boolean
          avatar_url?: string | null
          display_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_directory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          active_role: string | null
          avatar_original_url: string | null
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          last_login_at: string | null
          login_username: string
          must_change_password: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          active_role?: string | null
          avatar_original_url?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          last_login_at?: string | null
          login_username: string
          must_change_password?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          active_role?: string | null
          avatar_original_url?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_login_at?: string | null
          login_username?: string
          must_change_password?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      settlements: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          document_url: string
          id: string
          manager_user_id: string | null
          period_end: string | null
          period_start: string | null
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          document_url: string
          id?: string
          manager_user_id?: string | null
          period_end?: string | null
          period_start?: string | null
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          document_url?: string
          id?: string
          manager_user_id?: string | null
          period_end?: string | null
          period_start?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          internal: boolean
          ticket_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          internal?: boolean
          ticket_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_user_id: string | null
          category: string | null
          closed_at: string | null
          created_at: string
          creator_id: string | null
          description: string | null
          external_url: string | null
          id: string
          internal_notes: string | null
          opened_by_user_id: string
          priority: string
          status: string
          subject: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          internal_notes?: string | null
          opened_by_user_id: string
          priority?: string
          status?: string
          subject: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          category?: string | null
          closed_at?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          internal_notes?: string | null
          opened_by_user_id?: string
          priority?: string
          status?: string
          subject?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_opened_by_user_id_fkey"
            columns: ["opened_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          active: boolean
          created_at: string
          membership_role: string
          team_id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          membership_role?: string
          team_id: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          membership_role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          name: string
          slug: string
          source_manager_email: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          slug: string
          source_manager_email?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          slug?: string
          source_manager_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_creator_active: {
        Args: { p_active: boolean; p_actor_id: string; p_creator_id: string }
        Returns: undefined
      }
      admin_update_access: {
        Args: {
          p_actor_id: string
          p_roles?: string[]
          p_team_ids?: string[]
          p_user_id: string
        }
        Returns: undefined
      }
      commit_campaigns_import: {
        Args: {
          p_actor_id: string
          p_import_id: string
          p_invalid?: number
          p_rows: Json
        }
        Returns: Json
      }
      commit_creators_import: {
        Args: {
          p_actor_id: string
          p_import_id: string
          p_invalid?: number
          p_rows: Json
        }
        Returns: undefined
      }
      commit_metrics_import: {
        Args: {
          p_actor_id: string
          p_import_id: string
          p_invalid?: number
          p_rows: Json
        }
        Returns: undefined
      }
      finish_password_change: { Args: never; Returns: undefined }
      moderate_community: {
        Args: { p_hidden: boolean; p_id: string; p_kind: string }
        Returns: undefined
      }
      record_login_success: { Args: never; Returns: undefined }
      switch_role: { Args: { target_role: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
