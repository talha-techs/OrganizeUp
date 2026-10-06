import React from 'react';

/**
 * OrganizeUp Resource Container Icon
 * A sleek knowledge vault / resource container with stacked media & document cards
 * and an ascending dynamic "Up" arrow, directly evoking the OrganizeUp logo.
 */
export const ResourceContainerIcon = ({
  size = 24,
  className = '',
  strokeWidth = 1.8,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Back Container Tab / Rim */}
      <path
        d="M3 8C3 6.9 3.9 6 5 6H8.2L10.2 8H19C20.1 8 21 8.9 21 10V18C21 19.1 20.1 20 19 20H5C3.9 20 3 19.1 3 18V8Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Layer 1: Document Resource Card (left, emerging upward) */}
      <path
        d="M6.5 4.5H11.5C12.05 4.5 12.5 4.95 12.5 5.5V8.5H6.5V5.5C6.5 4.95 6.95 4.5 7.5 4.5Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <line
        x1="8"
        y1="6.5"
        x2="11"
        y2="6.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* Layer 2: Media Resource Card (right, emerging upward with play symbol) */}
      <path
        d="M11.5 2.5H16.5C17.05 2.5 17.5 2.95 17.5 3.5V8.5H11.5V3.5C11.5 2.95 11.95 2.5 12.5 2.5Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="13.8,4.3 15.6,5.5 13.8,6.7"
        fill="currentColor"
        stroke="none"
      />

      {/* Front Container Pocket Rim (Clean modern tech pocket) */}
      <path
        d="M3 12.5L8.5 15H15.5L21 12.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Upward Dynamic Launch Arrow (The "Up" in OrganizeUp) */}
      <path
        d="M12 18.2V13.8"
        stroke="currentColor"
        strokeWidth={strokeWidth * 1.15}
        strokeLinecap="round"
      />
      <path
        d="M9.8 15.8L12 13.5L14.2 15.8"
        stroke="currentColor"
        strokeWidth={strokeWidth * 1.15}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ResourceContainerIcon;
