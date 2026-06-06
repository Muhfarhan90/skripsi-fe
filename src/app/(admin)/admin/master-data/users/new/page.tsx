import { redirect } from "next/navigation";

export default function AdminUserCreatePage() {
  redirect("/admin/master-data/students/new");
}
