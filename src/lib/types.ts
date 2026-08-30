export type Role = "admin" | "staff" | "employee";
export type Status = "pending" | "active" | "inactive";

export type Profile = {
  id: string;
  name: string;
  phone: string;
  role: Role;
  status: Status;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  is_test: boolean;
};

export type Item = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type DailyMenu = {
  id: string;
  menu_date: string;
  cutoff_time: string;
  status: "draft" | "published";
  locked_at: string | null;
  published_at: string | null;
};

export type GuestMeal = {
  id: string;
  host_id: string;
  daily_menu_id: string;
  item_id: string;
  quantity: number;
  guest_label: string | null;
  unit_price_bdt: number;
  created_at: string;
};

export type CostMode = "treat" | "shared";
export type EventStatus = "announced" | "settled" | "cancelled";
export type Rsvp = "pending" | "in" | "out";

export type OfficeEvent = {
  id: string;
  created_by: string;
  collector_id: string;
  title: string;
  details: string | null;
  event_at: string;
  cost_mode: CostMode;
  total_amount_bdt: number | null;
  status: EventStatus;
  created_at: string;
};

export type EventParticipant = {
  event_id: string;
  employee_id: string;
  rsvp: Rsvp;
  custom_amount_bdt: number | null;
  responded_at: string | null;
};

export type Payment = {
  id: string;
  payer_id: string;
  payee_id: string;
  amount_bdt: number;
  method: "cash" | "qr";
  event_id: string | null;
  meal_month: string | null;
  note: string | null;
  claimed_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
};

export type PaymentDetails = {
  employee_id: string;
  provider: "bkash" | "nagad" | "rocket" | "other" | null;
  number: string | null;
  qr_image: string | null;
};

export type MealBill = {
  employee_id: string;
  month: string;
  own_meals: number;
  guest_meals: number;
  amount_bdt: number;
};

export type Order = {
  id: string;
  employee_id: string;
  daily_menu_id: string;
  item_id: string;
  source: "manual" | "auto";
  picked_at: string;
  unit_price_bdt: number;
};

export type PasswordReset = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "used" | "denied";
  code: string | null;
  requested_at: string;
  expires_at: string | null;
  profile: { name: string; phone: string; role: Role } | null;
};

export const HOME_FOR_ROLE: Record<Role, string> = {
  admin: "/admin",
  staff: "/staff",
  employee: "/employee",
};
