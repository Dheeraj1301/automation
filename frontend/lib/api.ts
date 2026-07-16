const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? "Request failed");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logo_path: string | null;
}

export interface MyOrganization extends Organization {
  role: "owner" | "admin" | "staff";
}

export interface Member {
  user_id: string;
  email: string;
  full_name: string;
  role: "owner" | "admin" | "staff";
}

export interface Invitation {
  id: string;
  email: string;
  role: "admin" | "staff";
  status: string;
  expires_at: string;
}

export interface InvitationPreview {
  organization_name: string;
  email: string;
  role: string;
  is_valid: boolean;
}

export const api = {
  signup: (data: { email: string; password: string; full_name: string; organization_name: string }) =>
    request<TokenResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<TokenResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),

  me: (token: string) => request<CurrentUser>("/api/auth/me", {}, token),

  listOrganizations: (token: string) => request<MyOrganization[]>("/api/organizations", {}, token),

  createOrganization: (data: { name: string }, token: string) =>
    request<Organization>("/api/organizations", { method: "POST", body: JSON.stringify(data) }, token),

  updateOrganization: (orgId: string, data: { name: string }, token: string) =>
    request<Organization>(`/api/organizations/${orgId}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  uploadLogo: (orgId: string, file: File, token: string) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<Organization>(`/api/organizations/${orgId}/logo`, { method: "POST", body: formData }, token);
  },

  listMembers: (orgId: string, token: string) => request<Member[]>(`/api/organizations/${orgId}/members`, {}, token),

  updateMemberRole: (orgId: string, userId: string, role: string, token: string) =>
    request<Member>(
      `/api/organizations/${orgId}/members/${userId}`,
      { method: "PATCH", body: JSON.stringify({ role }) },
      token
    ),

  removeMember: (orgId: string, userId: string, token: string) =>
    request<void>(`/api/organizations/${orgId}/members/${userId}`, { method: "DELETE" }, token),

  listInvites: (orgId: string, token: string) =>
    request<Invitation[]>(`/api/organizations/${orgId}/invites`, {}, token),

  createInvite: (orgId: string, data: { email: string; role: string }, token: string) =>
    request<Invitation>(
      `/api/organizations/${orgId}/invites`,
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  revokeInvite: (orgId: string, inviteId: string, token: string) =>
    request<void>(`/api/organizations/${orgId}/invites/${inviteId}`, { method: "DELETE" }, token),

  previewInvite: (token: string) => request<InvitationPreview>(`/api/invites/${token}`),

  acceptInvite: (inviteToken: string, authToken: string) =>
    request<MyOrganization>(
      "/api/invites/accept",
      { method: "POST", body: JSON.stringify({ token: inviteToken }) },
      authToken
    ),
};
