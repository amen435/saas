import React from "react";

export default function FormSectionCard({ icon: Icon, title, description, children, className = "" }) {
  return (
    <div className={`bg-card rounded-xl border border-border overflow-hidden shadow-card ${className}`}>
      <div className="p-5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary-foreground" />
            </div>
          )}
          <div>
            <h3 className="font-bold text-heading text-lg">{title}</h3>
            {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
