import { useLocation } from "react-router-dom";

export function Placeholder() {
  const { pathname } = useLocation();
  return (
    <div className="flex h-full items-center justify-center">
      <p className="font-heading text-lg text-gray-500">
        {pathname === "/" ? "Dashboard" : pathname.slice(1).replace(/\//g, " / ")} — coming soon
      </p>
    </div>
  );
}
