import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardTitle } from "../components/ui/Card";

// SECTION: Landing
export function Landing() {
  return (
    <div className="lvx-landing">
      <div className="lvx-landing-inner">
        <h1 className="lvx-h1">Lumvexor</h1>
        <p className="lvx-lead">
          Visibility Infrastructure for organizations that require consistent market presence.
        </p>

        <div className="lvx-row">
          <Link to="/app">
            <Button variant="primary">Enter App</Button>
          </Link>

          <a href="https://www.lumvexor.com" target="_blank" rel="noreferrer">
            <Button variant="secondary">Visit Site</Button>
          </a>
        </div>

        <Card>
          <CardTitle>Next</CardTitle>
          <CardBody>
            Project workspaces are live. Next module: previews with watermarking + expiration rules.
          </CardBody>
        </Card>
      </div>
    </div>
  );
}