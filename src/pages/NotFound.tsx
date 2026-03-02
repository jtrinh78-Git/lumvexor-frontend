import React from "react";
import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="lvx-landing">
      <div className="lvx-landing-inner">
        <h1 className="lvx-h1">404</h1>
        <p className="lvx-lead">That page doesn’t exist.</p>
        <Link to="/" className="lvx-button">
          Back Home
        </Link>
      </div>
    </div>
  );
}