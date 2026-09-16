export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          at: string
          before: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          org_id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          org_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          org_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          channel: string
          failure_reason: string | null
          id: string
          invoice_id: string
          org_id: string
          provider_message_id: string | null
          recipient: string
          sent_at: string
          sent_by: string | null
          status: string
        }
        Insert: {
          channel: string
          failure_reason?: string | null
          id?: string
          invoice_id: string
          org_id: string
          provider_message_id?: string | null
          recipient: string
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Update: {
          channel?: string
          failure_reason?: string | null
          id?: string
          invoice_id?: string
          org_id?: string
          provider_message_id?: string | null
          recipient?: string
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "communications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          amount_paise: number
          cgst_paise: number
          created_at: string
          created_by: string | null
          credit_note_no: string
          id: string
          igst_paise: number
          invoice_id: string
          issued_on: string
          org_id: string
          reason: string
          sgst_paise: number
          status: string
        }
        Insert: {
          amount_paise: number
          cgst_paise?: number
          created_at?: string
          created_by?: string | null
          credit_note_no: string
          id?: string
          igst_paise?: number
          invoice_id: string
          issued_on?: string
          org_id: string
          reason: string
          sgst_paise?: number
          status?: string
        }
        Update: {
          amount_paise?: number
          cgst_paise?: number
          created_at?: string
          created_by?: string | null
          credit_note_no?: string
          id?: string
          igst_paise?: number
          invoice_id?: string
          issued_on?: string
          org_id?: string
          reason?: string
          sgst_paise?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          doc_type: string
          fy: string
          last_value: number
          org_id: string
          updated_at: string
        }
        Insert: {
          doc_type: string
          fy: string
          last_value?: number
          org_id: string
          updated_at?: string
        }
        Update: {
          doc_type?: string
          fy?: string
          last_value?: number
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_sequences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_paise: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          incurred_on: string
          org_id: string
          party_id: string | null
        }
        Insert: {
          amount_paise: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incurred_on?: string
          org_id: string
          party_id?: string | null
        }
        Update: {
          amount_paise?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          incurred_on?: string
          org_id?: string
          party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_party_org_fk"
            columns: ["party_id", "org_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      export_batches: {
        Row: {
          exported_at: string
          exported_by: string | null
          id: string
          kind: string
          org_id: string
          range_from: string
          range_to: string
          record_count: number
        }
        Insert: {
          exported_at?: string
          exported_by?: string | null
          id?: string
          kind: string
          org_id: string
          range_from: string
          range_to: string
          record_count?: number
        }
        Update: {
          exported_at?: string
          exported_by?: string | null
          id?: string
          kind?: string
          org_id?: string
          range_from?: string
          range_to?: string
          record_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "export_batches_exported_by_fkey"
            columns: ["exported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_batches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          amount_paise: number
          description: string
          discount_paise: number
          hsn_sac: string | null
          id: string
          invoice_id: string
          quantity: number | null
          rate_paise: number | null
          service_completion_id: string | null
          unit: string | null
        }
        Insert: {
          amount_paise: number
          description: string
          discount_paise?: number
          hsn_sac?: string | null
          id?: string
          invoice_id: string
          quantity?: number | null
          rate_paise?: number | null
          service_completion_id?: string | null
          unit?: string | null
        }
        Update: {
          amount_paise?: number
          description?: string
          discount_paise?: number
          hsn_sac?: string | null
          id?: string
          invoice_id?: string
          quantity?: number | null
          rate_paise?: number | null
          service_completion_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_service_completion_id_fkey"
            columns: ["service_completion_id"]
            isOneToOne: false
            referencedRelation: "service_completion_margin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_service_completion_id_fkey"
            columns: ["service_completion_id"]
            isOneToOne: false
            referencedRelation: "service_completions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          bill_to_override_reason: string | null
          bill_to_party_id: string
          cgst_paise: number
          created_at: string
          created_by: string | null
          currency: string
          deliver_to_party_id: string | null
          disputed_reason: string | null
          due_date: string | null
          id: string
          igst_paise: number
          invoice_date: string
          invoice_no: string
          is_disputed: boolean
          issued_snapshot: Json | null
          notes: string | null
          org_id: string
          pdf_path: string | null
          round_off_paise: number
          sgst_paise: number
          status: string
          tax_rate_pct: number
          tax_treatment: string
          taxable_value_paise: number
          total_paise: number
          updated_at: string
        }
        Insert: {
          bill_to_override_reason?: string | null
          bill_to_party_id: string
          cgst_paise?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          deliver_to_party_id?: string | null
          disputed_reason?: string | null
          due_date?: string | null
          id?: string
          igst_paise?: number
          invoice_date?: string
          invoice_no: string
          is_disputed?: boolean
          issued_snapshot?: Json | null
          notes?: string | null
          org_id: string
          pdf_path?: string | null
          round_off_paise?: number
          sgst_paise?: number
          status?: string
          tax_rate_pct?: number
          tax_treatment: string
          taxable_value_paise?: number
          total_paise?: number
          updated_at?: string
        }
        Update: {
          bill_to_override_reason?: string | null
          bill_to_party_id?: string
          cgst_paise?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          deliver_to_party_id?: string | null
          disputed_reason?: string | null
          due_date?: string | null
          id?: string
          igst_paise?: number
          invoice_date?: string
          invoice_no?: string
          is_disputed?: boolean
          issued_snapshot?: Json | null
          notes?: string | null
          org_id?: string
          pdf_path?: string | null
          round_off_paise?: number
          sgst_paise?: number
          status?: string
          tax_rate_pct?: number
          tax_treatment?: string
          taxable_value_paise?: number
          total_paise?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_bill_to_party_id_fkey"
            columns: ["bill_to_party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_deliver_to_party_id_fkey"
            columns: ["deliver_to_party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          address: string | null
          bank_details: Json
          created_at: string
          credit_note_prefix: string
          default_tax_rate_pct: number
          default_tax_treatment: string
          gstin: string | null
          id: string
          invoice_prefix: string
          legal_name: string
          logo_path: string | null
          pan: string | null
          state_code: string
          transin: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_details?: Json
          created_at?: string
          credit_note_prefix?: string
          default_tax_rate_pct?: number
          default_tax_treatment?: string
          gstin?: string | null
          id?: string
          invoice_prefix?: string
          legal_name: string
          logo_path?: string | null
          pan?: string | null
          state_code: string
          transin?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_details?: Json
          created_at?: string
          credit_note_prefix?: string
          default_tax_rate_pct?: number
          default_tax_treatment?: string
          gstin?: string | null
          id?: string
          invoice_prefix?: string
          legal_name?: string
          logo_path?: string | null
          pan?: string | null
          state_code?: string
          transin?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      parties: {
        Row: {
          created_at: string
          credit_limit_paise: number | null
          default_tax_treatment: string | null
          gstin: string | null
          id: string
          name: string
          notes: string | null
          org_id: string
          payment_terms_days: number
          state_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_limit_paise?: number | null
          default_tax_treatment?: string | null
          gstin?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id: string
          payment_terms_days?: number
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_limit_paise?: number | null
          default_tax_treatment?: string | null
          gstin?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string
          payment_terms_days?: number
          state_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      party_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          is_billing: boolean
          is_delivery: boolean
          label: string | null
          party_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_billing?: boolean
          is_delivery?: boolean
          label?: string | null
          party_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_billing?: boolean
          is_delivery?: boolean
          label?: string | null
          party_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_addresses_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      party_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          party_id: string
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          party_id: string
          phone?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          party_id?: string
          phone?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_contacts_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          org_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          org_id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          org_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_allocations: {
        Row: {
          amount_allocated_paise: number
          created_at: string
          id: string
          invoice_id: string
          receipt_id: string
        }
        Insert: {
          amount_allocated_paise: number
          created_at?: string
          id?: string
          invoice_id: string
          receipt_id: string
        }
        Update: {
          amount_allocated_paise?: number
          created_at?: string
          id?: string
          invoice_id?: string
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "receipt_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount_paise: number
          attachment_path: string | null
          created_at: string
          created_by: string | null
          id: string
          method: string
          notes: string | null
          org_id: string
          payer_party_id: string
          received_on: string
          reference_no: string | null
        }
        Insert: {
          amount_paise: number
          attachment_path?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          method: string
          notes?: string | null
          org_id: string
          payer_party_id: string
          received_on?: string
          reference_no?: string | null
        }
        Update: {
          amount_paise?: number
          attachment_path?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          method?: string
          notes?: string | null
          org_id?: string
          payer_party_id?: string
          received_on?: string
          reference_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payer_party_id_fkey"
            columns: ["payer_party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      service_completions: {
        Row: {
          amount_paise: number
          cost_paise: number | null
          created_at: string
          created_by: string | null
          destination: string | null
          external_reference: string | null
          id: string
          notes: string | null
          occurred_on: string
          org_id: string
          origin: string | null
          party_id: string
          proof_file_path: string | null
          quantity: number | null
          rate_paise: number | null
          service_type: string | null
          status: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          amount_paise: number
          cost_paise?: number | null
          created_at?: string
          created_by?: string | null
          destination?: string | null
          external_reference?: string | null
          id?: string
          notes?: string | null
          occurred_on: string
          org_id: string
          origin?: string | null
          party_id: string
          proof_file_path?: string | null
          quantity?: number | null
          rate_paise?: number | null
          service_type?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          cost_paise?: number | null
          created_at?: string
          created_by?: string | null
          destination?: string | null
          external_reference?: string | null
          id?: string
          notes?: string | null
          occurred_on?: string
          org_id?: string
          origin?: string | null
          party_id?: string
          proof_file_path?: string | null
          quantity?: number | null
          rate_paise?: number | null
          service_type?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_completions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_completions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_completions_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      invoice_balances: {
        Row: {
          amount_credited_paise: number | null
          amount_paid_paise: number | null
          balance_due_paise: number | null
          bill_to_party_id: string | null
          deliver_to_party_id: string | null
          due_date: string | null
          invoice_date: string | null
          invoice_id: string | null
          invoice_no: string | null
          org_id: string | null
          status: string | null
          total_paise: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_bill_to_party_id_fkey"
            columns: ["bill_to_party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_deliver_to_party_id_fkey"
            columns: ["deliver_to_party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      party_outstanding: {
        Row: {
          amount_outstanding_paise: number | null
          amount_overdue_paise: number | null
          invoices_outstanding: number | null
          invoices_overdue: number | null
          org_id: string | null
          party_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_bill_to_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      party_ready_to_bill: {
        Row: {
          org_id: string | null
          party_id: string | null
          pending_amount_paise: number | null
          pending_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_completions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_completions_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      service_completion_margin: {
        Row: {
          cost_paise: number | null
          id: string | null
          margin_paise: number | null
          occurred_on: string | null
          org_id: string | null
          party_id: string | null
          revenue_paise: number | null
          status: string | null
        }
        Insert: {
          cost_paise?: number | null
          id?: string | null
          margin_paise?: never
          occurred_on?: string | null
          org_id?: string | null
          party_id?: string | null
          revenue_paise?: number | null
          status?: string | null
        }
        Update: {
          cost_paise?: number | null
          id?: string | null
          margin_paise?: never
          occurred_on?: string | null
          org_id?: string | null
          party_id?: string | null
          revenue_paise?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_completions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_completions_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cancel_invoice: {
        Args: { p_invoice_id: string; p_reason: string }
        Returns: {
          invoice_id: string
        }[]
      }
      create_credit_note: {
        Args: {
          p_amount_paise: number
          p_cgst_paise?: number
          p_igst_paise?: number
          p_invoice_id: string
          p_reason: string
          p_sgst_paise?: number
        }
        Returns: {
          credit_note_id: string
          credit_note_no: string
        }[]
      }
      create_invoice: {
        Args: {
          p_bill_to_override_reason?: string
          p_bill_to_party_id: string
          p_deliver_to_party_id: string
          p_due_date?: string
          p_free_lines: Json
          p_notes?: string
          p_service_completion_ids: string[]
          p_tax: Json
        }
        Returns: {
          invoice_id: string
          invoice_no: string
        }[]
      }
      create_organisation: {
        Args: {
          p_address: string
          p_credit_note_prefix?: string
          p_default_tax_rate_pct?: number
          p_default_tax_treatment?: string
          p_gstin: string
          p_invoice_prefix?: string
          p_legal_name: string
          p_pan: string
          p_state_code: string
          p_transin: string
        }
        Returns: {
          org_id: string
        }[]
      }
      current_org_id: { Args: never; Returns: string }
      current_role_name: { Args: never; Returns: string }
      fy_code: { Args: { p_date: string }; Returns: string }
      has_role: { Args: { p_roles: string[] }; Returns: boolean }
      next_doc_number: {
        Args: { p_date: string; p_doc_type: string; p_org_id: string }
        Returns: string
      }
      record_receipt: {
        Args: {
          p_allocations: Json
          p_amount_paise: number
          p_method: string
          p_notes?: string
          p_payer_party_id: string
          p_received_on: string
          p_reference_no?: string
        }
        Returns: {
          receipt_id: string
        }[]
      }
      seed_document_sequence: {
        Args: {
          p_doc_type: string
          p_fy: string
          p_org_id: string
          p_starting_number: number
        }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

