import { useEffect } from "react";

/**
 * Sets the browser tab title. Resets to default on unmount.
 * @param {string} title - Page title (appended with " | OrganizeUp")
 */
const useDocumentTitle = (title) => {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | OrganizeUp` : "OrganizeUp";
    return () => {
      document.title = prev;
    };
  }, [title]);
};

export default useDocumentTitle;
