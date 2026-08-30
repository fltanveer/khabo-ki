import { redirect } from "next/navigation";

// History and money are the same page now that every meal carries a cost.
export default function HistoryRedirect() {
  redirect("/employee/money");
}
