import { createBrowserRouter } from "react-router-dom";

import { RootLayout } from "./layouts/RootLayout";
import { AppLayout } from "./layouts/AppLayout";
import { RequireRole } from "./components/RequireRole";

import { RequireSession } from "./auth/RequireSession";
import LoginPage from "./pages/Login";

import { Landing } from "./pages/Landing";
import { NotFound } from "./pages/NotFound";
import { AdminUsers } from "./pages/app/AdminUsers";
import { AppHome } from "./pages/app/AppHome";
import { AppProjects } from "./pages/app/AppProjects";
import { AppSettings } from "./pages/app/AppSettings";

import { ProjectLayout } from "./pages/app/ProjectLayout";
import { ProjectOverview } from "./pages/app/project/ProjectOverview";
import { ProjectPreviews } from "./pages/app/project/ProjectPreviews";
import { ProjectAssets } from "./pages/app/project/ProjectAssets";
import { ProjectPublishing } from "./pages/app/project/ProjectPublishing";
import { ProjectSettings } from "./pages/app/project/ProjectSettings";
import Performance from "./pages/app/Performance";

// SECTION: router
export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: "login", element: <LoginPage /> },

      {
        element: <RequireSession />,
        children: [
          {
            path: "app",
            element: <AppLayout />,
            children: [
              {
                path: "admin/users",
                element: (
                  <RequireRole roles={["admin"]}>
                    <AdminUsers />
                  </RequireRole>
                ),
              },
              { index: true, element: <AppHome /> },
              { path: "projects", element: <AppProjects /> },
              {
                path: "performance",
                element: (
                  <RequireRole roles={["admin", "manager"]}>
                    <Performance />
                  </RequireRole>
                ),
              },
              { path: "settings", element: <AppSettings /> },

              {
                path: "projects/:projectId",
                element: <ProjectLayout />,
                children: [
                  { index: true, element: <ProjectOverview /> },
                  { path: "previews", element: <ProjectPreviews /> },
                  { path: "assets", element: <ProjectAssets /> },
                  { path: "publishing", element: <ProjectPublishing /> },
                  { path: "settings", element: <ProjectSettings /> },
                ],
              },
            ],
          },
        ],
      },

      { path: "*", element: <NotFound /> },
    ],
  },
]);