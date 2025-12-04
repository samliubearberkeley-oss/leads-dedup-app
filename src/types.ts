export type Lead = {
  id?: string;
  url: string;
  channel?: string;
  username?: string;
  email?: string;
  valid_email?: string;
  post_per_month?: string;
  similarity?: string;
  last_updated?: string;
  country?: string;
  subscribers?: string;
  posts?: string;
  views?: string;
  er?: string;
  vr?: string;
  links?: string;
  topics?: string;
  audiences?: string;
  created_at?: string;
  updated_at?: string;
}

export type ProcessResult = {
  newLeads: Lead[];
  duplicates: Lead[];
  totalProcessed: number;
}

export type Stats = {
  total: number;
  uniqueEmails: number;
}
