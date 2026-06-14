import { redirect } from "next/navigation";

export default async function AdminAccountOperationsPage() {
  redirect("/admin/users");
}
