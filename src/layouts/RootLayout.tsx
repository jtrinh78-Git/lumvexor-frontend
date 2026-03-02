import { Outlet } from "react-router-dom";
import { TerritoryProvider } from "../territory/TerritoryContext";

// SECTION: RootLayout
export function RootLayout() {
  return (
    <TerritoryProvider>
      <Outlet />
    </TerritoryProvider>
  );
}