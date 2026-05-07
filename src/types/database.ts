export interface Client {
  id: string
  name: string
  logo_url: string | null
  description: string | null
  color: string
  category: 'klant' | 'atleet' | 'podcast' | 'intern'
  created_at: string
}

export interface Document {
  id: string
  title: string
  content: string
  client_id: string
  file_url: string | null
  created_at: string
}

export interface FileRecord {
  id: string
  client_id: string
  filename: string
  description: string | null
  file_type: string
  file_size: number
  storage_path: string
  uploaded_by: string | null
  created_at: string
}

export interface Post {
  id: string
  client_id: string
  template: string
  home_team: string | null
  away_team: string | null
  score: string | null
  player_name: string | null
  match_day: string | null
  thumbnail_url: string | null
  created_by: string | null
  created_at: string
}

export interface Meeting {
  id: string
  client_id: string
  title: string
  transcription: string
  summary: string | null
  created_by: string | null
  created_at: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
}
