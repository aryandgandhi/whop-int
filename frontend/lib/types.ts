export interface User {
  id: string;
  email: string;
  display_name: string;
  bio: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Topic {
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  topic_slug: string;
  reward_per_slot_cents: number;
  currency: string;
  slots_total: number;
  slots_filled: number;
  slots_completed: number;
  slots_remaining: number;
  status: "open" | "in_progress" | "completed" | "cancelled";
  poster: { id: string; display_name: string };
  created_at: string;
  updated_at: string;
}

export type SubmissionStatus =
  | "volunteered"
  | "accepted"
  | "submitted"
  | "completed"
  | "rejected"
  | "withdrawn";

export interface TaskListResponse {
  items: Task[];
  total: number;
  page: number;
  page_size: number;
}

export interface Submission {
  id: string;
  task_id: string;
  worker: { id: string; display_name: string };
  pitch: string | null;
  content: string | null;
  status: SubmissionStatus;
  created_at: string;
  updated_at: string;
}

export interface SubmissionWithTask extends Submission {
  task: Task;
}

export interface Review {
  id: string;
  task_id: string;
  reviewer: { id: string; display_name: string };
  reviewee_id: string;
  role: "worker" | "poster";
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  bio: string | null;
  created_at: string;
  tasks_posted: number;
  tasks_completed: number;
  total_earned_cents: number;
  avg_rating: number | null;
  review_count: number;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount_cents: number;
  task_id: string | null;
  description: string | null;
  created_at: string;
}

export interface Wallet {
  available_cents: number;
  escrow_cents: number;
  transactions: WalletTransaction[];
}
