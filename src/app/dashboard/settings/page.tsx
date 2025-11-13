'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import UserManagement from "./UserManagement";

const SCREEN_ID = "settings";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
  const screens = Array.isArray(session?.user?.screens) ? session.user.screens : [];
    if (session?.user?.role === "admin" || (session?.user?.role === "user" && !screens.includes(SCREEN_ID))) {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") return null;
  const screens = Array.isArray(session?.user?.screens) ? session.user.screens : [];
  if (session?.user?.role === "admin" || (session?.user?.role === "user" && !screens.includes(SCREEN_ID))) {
    return null;
  }

  return (
    <>
      <div className="w-full overflow-x-hidden px-2 sm:px-4">
        <div className="mt-6 lg:mt-14 w-full max-w-full mx-auto">
          <h2 className="text-xl font-semibold mb-4">Configuración del sistema</h2>
          <p className="text-gray-700 mb-4">Aquí podrás gestionar productos, precios y configuraciones generales del sistema.</p>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6 overflow-x-hidden">
            <UserManagement />
          </div>
        </div>
      </div>
    </>
  );
}
