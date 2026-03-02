import React from "react";
import { Link } from "react-router-dom";

export function Landing() {
  return (
    <div className="lvx-landing">
      <div className="lvx-landing-inner">
        <h1 className="lvx-h1">Lumvexor</h1>
        <p className="lvx-lead">
          Production-ready app shell: routing, layouts, sidebar navigation, and a
          clean SaaS foundation.
        </p>

        <div className="lvx-row">
          <Link to="/app" className="lvx-button">
            Enter App
          </Link>
          <a
            className="lvx-button lvx-button-secondary"
            href="https://www.lumvexor.com"
            target="_blank"
            rel="noreferrer"
          >
            Visit Site
          </a>
        </div>

        <div className="lvx-card">
          <div className="lvx-card-title">Next</div>
          <ul className="lvx-list">
            <li>Auth gating (Supabase) after the structure is locked</li>
            <li>Dashboard modules (projects, assets, jobs, analytics)</li>
            <li>Design system + UI components</li>
          </ul>
        </div>
      </div>
    </div>
  );
}