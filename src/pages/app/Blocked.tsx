// SECTION: Imports
import { useProfile } from "../../auth/ProfileProvider";
import { Card, CardBody, CardTitle } from "../../components/ui/Card";

// SECTION: Blocked
export function Blocked() {
  const p = useProfile();

  return (
    <div className="lvx-page">
      <Card>
        <CardTitle>Workspace blocked</CardTitle>
        <CardBody>
          <div className="lvx-muted" style={{ marginBottom: 10 }}>
            Access is blocked because org resolution could not be validated.
          </div>

          <ul className="lvx-list">
            <li>
              Reason: <strong>{p.blockReason ?? "unknown"}</strong>
            </li>
            <li>
              Active Org: <span className="lvx-muted">{p.activeOrgId ?? "—"}</span>
            </li>
            <li>
              Role: <span className="lvx-muted">{p.role ?? "—"}</span>
            </li>
          </ul>

          <div className="lvx-muted" style={{ marginTop: 12 }}>
            Fix requires a valid <strong>profiles.active_org_id</strong> and a matching{" "}
            <strong>org_memberships</strong> row enforced by RLS.
          </div>
        </CardBody>
      </Card>
    </div>
  );
}