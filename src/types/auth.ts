export interface AuthUser {
  id: number;
  role_id: number;
  fullname: string;
  email: string;
  nisn: string | null;
  phone: string | null;
  address: string | null;
  avatar: string | null;
  gender: "laki" | "perempuan" | null;
  bio: string | null;
  date_of_birth: string | null;
  school_origin: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[] | number[]>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterRequest {
  fullname: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_id: number;
  nisn?: string;
  phone?: string;
  address?: string;
  school_origin?: string;
  gender?: "laki" | "perempuan";
  bio?: string;
  date_of_birth?: string;
}

export interface RegisterResponse {
  user: AuthUser;
  verification_url?: string;
  frontend_verification_url?: string;
  email_notification_status?: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  retry_after: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}
