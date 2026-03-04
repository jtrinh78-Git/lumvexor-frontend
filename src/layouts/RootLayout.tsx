import { Outlet } from "react-router-dom";
import { ProfileProvider } from "../auth/ProfileProvider";
import { TerritoryProvider } from "../territory/TerritoryContext";

// SECTION: RootLayout
export function RootLayout() {
  return (
    <ProfileProvider>
      <TerritoryProvider>
        <Outlet />
      </TerritoryProvider>
    </ProfileProvider>
  );
}