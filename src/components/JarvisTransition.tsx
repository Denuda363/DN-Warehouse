import React from "react";

interface JarvisTransitionProps {
  children: React.ReactNode;
  pageKey: string;
  mode?: "page" | "tab";
}

export const JarvisTransition: React.FC<JarvisTransitionProps> = ({ children }) => {
  return <>{children}</>;
};

