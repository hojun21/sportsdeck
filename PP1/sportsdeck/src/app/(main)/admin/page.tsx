import AdminNavBar from "./components/AdminNavBar";
export const dynamic = 'force-dynamic';

export default function AdminPanelPage() {
  return (
    <div className="p-6">
      <AdminNavBar/>
    </div>
  );
}