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

export type Order = {
  id: string;
  employee_id: string;
  daily_menu_id: string;
  item_id: string;
  source: "manual" | "auto";
  picked_at: string;
};

export const HOME_FOR_ROLE: Record<Role, string> = {
  admin: "/admin",
  staff: "/staff",
  employee: "/employee",
};
