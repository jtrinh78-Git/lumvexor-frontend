import { Outlet } from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider";
import { ProfileProvider } from "../auth/ProfileProvider";
import { TerritoryProvider } from "../territory/TerritoryContext";

// SECTION: RootLayout
export function RootLayout() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <TerritoryProvider>
          <Outlet />
        </TerritoryProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}