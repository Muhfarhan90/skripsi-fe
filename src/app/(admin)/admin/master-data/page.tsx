import { redirect } from "next/navigation";

export default function AdminDataRedirectPage() {
  redirect("/admin/master-data/students");
}
