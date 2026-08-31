import { redirect } from "next/navigation";

// Name and payment details live on one settings page now.
export default function PaymentRedirect() {
  redirect("/settings");
}
